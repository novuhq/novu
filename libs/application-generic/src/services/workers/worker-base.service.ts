import { Logger, OnModuleDestroy } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import {
  getSqsDefaultBatchSize,
  getSqsDefaultConcurrency,
  getSqsDefaultVisibilityTimeout,
  getSqsDefaultWaitTimeSeconds,
} from '../../config/workers';
import { PinoLogger } from '../../logging';
import { BullMqService, Job, Processor, WorkerOptions } from '../bull-mq';
import { INovuWorker } from '../readiness';
import {
  createSqsJobAdapter,
  ISqsConsumerOptions,
  ISqsMessageMeta,
  SQS_DEFAULT_BATCH_SIZE,
  SQS_DEFAULT_DRAIN_TIMEOUT_MS,
  SQS_DEFAULT_MAX_CONCURRENCY,
  SQS_DEFAULT_VISIBILITY_TIMEOUT,
  SQS_DEFAULT_WAIT_TIME_SECONDS,
  SqsConsumerService,
  SqsService,
} from '../sqs';

const LOG_CONTEXT = 'WorkerService';

export type WorkerProcessor = string | Processor<any, unknown, string> | undefined;

export type SqsCompletedHandler = (job: Job<any, unknown, string>) => Promise<void>;
export type SqsFailedHandler = (job: Job<any, unknown, string>, error: Error) => Promise<boolean>;

export { WorkerOptions };

export class WorkerBaseService implements INovuWorker, OnModuleDestroy {
  public bullMqService: BullMqService;
  private sqsConsumer?: SqsConsumerService;
  private sqsCompletedHandler?: SqsCompletedHandler;
  private sqsFailedHandler?: SqsFailedHandler;

  public readonly DEFAULT_ATTEMPTS = 3;

  public get bullMqWorker() {
    return this.bullMqService.worker;
  }

  constructor(
    public readonly topic: JobTopicNameEnum,
    public bullMqServiceInstance: BullMqService,
    protected sqsService?: SqsService,
    protected logger?: PinoLogger
  ) {
    this.bullMqService = bullMqServiceInstance;
  }

  public initWorker(processor: WorkerProcessor, options?: WorkerOptions, deferSqsStart = false): void {
    if (typeof processor === 'function') {
      this.createWorker(this.wrapForBullMQ(processor), options);
      this.initSqsConsumer(processor, options);

      if (!deferSqsStart) {
        this.startSqsConsumer();
      }
    } else {
      this.createWorker(processor, options);
    }

    Logger.log({ topic: this.topic, sqsEnabled: !!this.sqsConsumer }, 'Worker initialized', LOG_CONTEXT);
  }

  /*
   * Register a handler called when an SQS message is successfully processed.
   * Mirrors BullMQ's `worker.on('completed', ...)` event.
   */
  public setSqsCompletedHandler(handler: SqsCompletedHandler): void {
    this.sqsCompletedHandler = handler;
  }

  /*
   * Register a handler called when an SQS message processing fails.
   * Mirrors BullMQ's `worker.on('failed', ...)` event.
   *
   * The handler must return a boolean indicating whether SQS should retry the message:
   * - `true`: re-throw the error so SQS retries (message stays in queue)
   * - `false`: absorb the error so SQS deletes the message (failure handled in DB)
   */
  public setSqsFailedHandler(handler: SqsFailedHandler): void {
    this.sqsFailedHandler = handler;
  }

  private shouldSkipProcessing(data: any, jobId: string): boolean {
    if (data?.skipProcessing) {
      Logger.debug({ topic: this.topic, jobId }, 'Skipping job - marked for skip during migration', LOG_CONTEXT);

      return true;
    }

    return false;
  }

  private wrapForBullMQ(processor: Processor<any, unknown, string>): Processor<any, unknown, string> {
    return async (job: any) => {
      if (this.shouldSkipProcessing(job.data, job.id)) {
        return;
      }

      return await processor(job);
    };
  }

  public createWorker(processor: WorkerProcessor, options: WorkerOptions): void {
    this.bullMqService.createWorker(this.topic, processor, options);
  }

  private initSqsConsumer(processor: Processor<any, unknown, string>, options?: WorkerOptions): void {
    if (!this.sqsService?.isConfigured(this.topic)) {
      return;
    }

    const sqsConcurrency = getSqsDefaultConcurrency() ?? options?.concurrency ?? SQS_DEFAULT_MAX_CONCURRENCY;

    const sqsConsumerOptions: ISqsConsumerOptions = {
      maxNumberOfMessages: getSqsDefaultBatchSize() ?? SQS_DEFAULT_BATCH_SIZE,
      waitTimeSeconds: getSqsDefaultWaitTimeSeconds() ?? SQS_DEFAULT_WAIT_TIME_SECONDS,
      visibilityTimeout: getSqsDefaultVisibilityTimeout() ?? SQS_DEFAULT_VISIBILITY_TIMEOUT,
      maxConcurrency: sqsConcurrency,
    };

    this.sqsConsumer = new SqsConsumerService(
      this.topic,
      this.sqsService,
      this.wrapForSqs(processor),
      this.logger,
      sqsConsumerOptions
    );
  }

  public startSqsConsumer(): void {
    if (this.sqsConsumer) {
      this.sqsConsumer.start();
      Logger.log({ topic: this.topic }, 'SQS consumer started', LOG_CONTEXT);
    }
  }

  private wrapForSqs(processor: Processor<any, unknown, string>): (data: any, meta: ISqsMessageMeta) => Promise<void> {
    return async (data: any, meta: ISqsMessageMeta): Promise<void> => {
      const jobId = data._id || data.identifier || 'unknown';
      if (this.shouldSkipProcessing(data, jobId)) {
        return;
      }

      const jobMock = createSqsJobAdapter(data, meta, this.topic, jobId);

      try {
        await processor(jobMock);

        if (this.sqsCompletedHandler) {
          try {
            await this.sqsCompletedHandler(jobMock);
          } catch (handlerError) {
            Logger.error(
              {
                error: handlerError instanceof Error ? handlerError.message : String(handlerError),
                jobId,
                topic: this.topic,
              },
              'SQS completed handler failed',
              LOG_CONTEXT
            );
          }
        }
      } catch (error) {
        let shouldRetry = true;

        if (this.sqsFailedHandler) {
          try {
            shouldRetry = await this.sqsFailedHandler(jobMock, error as Error);
          } catch (handlerError) {
            Logger.error(
              {
                error: handlerError instanceof Error ? handlerError.message : String(handlerError),
                jobId,
                topic: this.topic,
              },
              'SQS failed handler error, defaulting to retry',
              LOG_CONTEXT
            );
            shouldRetry = true;
          }
        }

        if (shouldRetry) {
          throw error;
        }
      }
    };
  }

  public async isRunning(): Promise<boolean> {
    const bullMqRunning = await this.bullMqService.isWorkerRunning();

    if (!this.sqsConsumer) {
      return bullMqRunning;
    }

    const sqsRunning = this.sqsConsumer.getStatus().isRunning;

    return bullMqRunning || sqsRunning;
  }

  public async isPaused(): Promise<boolean> {
    const bullMqPaused = await this.bullMqService.isWorkerPaused();

    if (!this.sqsConsumer) {
      return bullMqPaused;
    }

    const sqsPaused = this.sqsConsumer.getStatus().isPaused;

    return bullMqPaused && sqsPaused;
  }

  public async pause(): Promise<void> {
    await this.bullMqService.pauseWorker();

    if (this.sqsConsumer) {
      await this.sqsConsumer.pause();
    }

    const backends = this.sqsConsumer ? 'BullMQ and SQS' : 'BullMQ';
    Logger.log({ topic: this.topic, backends }, 'Worker paused', LOG_CONTEXT);
  }

  public async resume(): Promise<void> {
    await this.bullMqService.resumeWorker();

    if (process.env.NODE_ENV === 'test') {
      Logger.debug({ topic: this.topic }, 'Worker waiting until ready', LOG_CONTEXT);
      await this.bullMqService.waitUntilWorkerIsReady();
      Logger.debug({ topic: this.topic }, 'Worker is now ready to process jobs', LOG_CONTEXT);
    }

    if (this.sqsConsumer) {
      await this.sqsConsumer.resume();
    }

    const backends = this.sqsConsumer ? 'BullMQ and SQS' : 'BullMQ';
    Logger.log({ topic: this.topic, backends }, 'Worker resumed', LOG_CONTEXT);
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log({ topic: this.topic }, 'Shutting down worker service', LOG_CONTEXT);

    const shutdownPromises: Promise<void>[] = [this.bullMqService.gracefulShutdown()];

    if (this.sqsConsumer) {
      shutdownPromises.push(this.sqsConsumer.stop({ drainTimeoutMs: SQS_DEFAULT_DRAIN_TIMEOUT_MS }));
    }

    await Promise.all(shutdownPromises);

    Logger.log({ topic: this.topic }, 'Worker service shutdown complete', LOG_CONTEXT);
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
