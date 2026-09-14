import { BadRequestException, HttpException, Logger, OnModuleDestroy } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { isBullMqEnabled } from '../../config/queue-backend';
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
  SqsRetryError,
  SqsService,
} from '../sqs';

const LOG_CONTEXT = 'WorkerService';

/**
 * 4xx HTTP statuses that should still be retried because the underlying
 * condition is transient: request timeout and rate limiting.
 */
const TRANSIENT_4XX_STATUSES = new Set<number>([408, 429]);

/**
 * Decides whether a processor error represents a permanent client-side
 * failure that cannot succeed on retry. Used as the default policy when
 * a worker has not registered its own `sqsFailedHandler`: 4xx failures
 * (bad payload, missing fields, validation, etc.) are acked and
 * everything else is re-thrown for SQS to redeliver.
 */
export function isPermanentClientError(error: unknown): boolean {
  if (error instanceof BadRequestException) {
    return true;
  }

  if (error instanceof HttpException) {
    const status = error.getStatus();

    return status >= 400 && status < 500 && !TRANSIENT_4XX_STATUSES.has(status);
  }

  return false;
}

export type WorkerProcessor = string | Processor<any, unknown, string> | undefined;

export type SqsCompletedHandler = (job: Job<any, unknown, string>) => Promise<void>;

/**
 * How long to wait before the message becomes visible again. Lets a worker
 * reproduce BullMQ's per-attempt backoff, which SQS has no equivalent of.
 */
export interface ISqsFailureOutcome {
  retry: boolean;
  retryDelayMs?: number;
}

/**
 * Returning a bare boolean keeps the original contract - only workers that
 * want a custom retry cadence need the object form.
 */
export type SqsFailedHandler = (job: Job<any, unknown, string>, error: Error) => Promise<boolean | ISqsFailureOutcome>;

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
    /*
     * The SQS consumer starts on queue-URL config alone, independently of
     * QUEUE_BACKEND. That asymmetry is what makes a rollback safe: dropping
     * back to `bullmq` leaves the consumer draining whatever SQS still holds
     * and whatever EventBridge fires later.
     */
    if (isBullMqEnabled()) {
      this.createWorker(processor, options);
    }

    if (typeof processor === 'function') {
      this.initSqsConsumer(processor, options);

      if (!deferSqsStart) {
        this.startSqsConsumer();
      }
    }

    Logger.log(
      { topic: this.topic, bullMqEnabled: isBullMqEnabled(), sqsEnabled: !!this.sqsConsumer },
      'Worker initialized',
      LOG_CONTEXT
    );
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
   * The handler decides whether SQS should retry the message:
   * - `true`: re-throw the error so SQS retries (message stays in queue)
   * - `false`: absorb the error so SQS deletes the message (failure handled in DB)
   *
   * Returning `{ retry, retryDelayMs }` instead also sets how long to wait
   * before the retry, which SQS has no native equivalent of - without it every
   * attempt waits the flat consumer-wide visibility timeout.
   */
  public setSqsFailedHandler(handler: SqsFailedHandler): void {
    this.sqsFailedHandler = handler;
  }

  public createWorker(processor: WorkerProcessor, options: WorkerOptions): void {
    this.bullMqService.createWorker(this.topic, processor, options);
  }

  private initSqsConsumer(processor: Processor<any, unknown, string>, options?: WorkerOptions): void {
    if (!this.sqsService?.isConfigured(this.topic)) {
      return;
    }

    /*
     * Precedence:
     *   1. `getSqsDefaultConcurrency()` — `SQS_DEFAULT_CONCURRENCY` ENV. Global
     *      ops lever to throttle every SQS consumer at runtime without a code
     *      change (e.g. downstream incident, DynamoDB hot partition, etc.).
     *   2. `options.concurrency` — per-worker value the worker declared (e.g.
     *      WORKFLOW_WORKER_CONCURRENCY=200, WEB_SOCKET_WORKER_CONCURRENCY=400),
     *      aligned with the BullMQ side via `getWorkerConcurrency`.
     *   3. `SQS_DEFAULT_MAX_CONCURRENCY` — hardcoded final fallback when neither
     *      a per-worker value nor the ENV is set.
     */
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
        let retryDelayMs: number | undefined;

        if (this.sqsFailedHandler) {
          try {
            const outcome = await this.sqsFailedHandler(jobMock, error as Error);

            if (typeof outcome === 'boolean') {
              shouldRetry = outcome;
            } else {
              shouldRetry = outcome.retry;
              retryDelayMs = outcome.retryDelayMs;
            }
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
        } else if (isPermanentClientError(error)) {
          /*
           * Defensive fallback for any SQS-backed worker that has not
           * registered its own `sqsFailedHandler`. 4xx errors cannot
           * succeed on retry, so ack the message instead of letting SQS
           * redeliver it every visibility timeout until it hits the DLQ.
           * The four production SQS workers (workflow, subscriber-
           * process, ws, standard) all register explicit handlers; this
           * branch protects future additions that forget to.
           */
          Logger.warn(
            {
              error: error instanceof Error ? error.message : String(error),
              jobId,
              topic: this.topic,
              attemptsMade: meta.receiveCount,
            },
            'SQS message has permanent client error, acking without retry',
            LOG_CONTEXT
          );

          return;
        }

        if (shouldRetry) {
          /*
           * Wrapping preserves the original error for logging while telling
           * the consumer to shorten this message's visibility instead of
           * leaving it on the flat consumer-wide timeout. A delay of 0 is a
           * real request to retry immediately - randomised backoffs round down
           * to it - so only an absent delay falls through to the flat timeout.
           */
          if (retryDelayMs !== undefined) {
            throw new SqsRetryError(error as Error, retryDelayMs);
          }

          throw error;
        }
      }
    };
  }

  /** True when a BullMQ worker exists; false once QUEUE_BACKEND retires it. */
  private get hasBullMqWorker(): boolean {
    return !!this.bullMqService.worker;
  }

  private describeBackends(): string {
    if (this.hasBullMqWorker) {
      return this.sqsConsumer ? 'BullMQ and SQS' : 'BullMQ';
    }

    return this.sqsConsumer ? 'SQS' : 'none';
  }

  public async isRunning(): Promise<boolean> {
    const bullMqRunning = this.hasBullMqWorker && (await this.bullMqService.isWorkerRunning());

    return bullMqRunning || (this.sqsConsumer?.getStatus().isRunning ?? false);
  }

  public async isPaused(): Promise<boolean> {
    const backends: boolean[] = [];

    if (this.hasBullMqWorker) {
      backends.push(await this.bullMqService.isWorkerPaused());
    }

    if (this.sqsConsumer) {
      backends.push(this.sqsConsumer.getStatus().isPaused);
    }

    // A worker with no backend is not "paused" - there is nothing to resume.
    return backends.length > 0 && backends.every(Boolean);
  }

  public async pause(): Promise<void> {
    await this.bullMqService.pauseWorker();

    if (this.sqsConsumer) {
      await this.sqsConsumer.pause();
    }

    Logger.log({ topic: this.topic, backends: this.describeBackends() }, 'Worker paused', LOG_CONTEXT);
  }

  /**
   * Cold start resumes what `pause` stopped. The SQS consumer is only resumed
   * when it was actually paused: it starts eagerly from the worker constructor,
   * so on a normal boot it is already running and a resume here would just warn.
   */
  public async resume(): Promise<void> {
    await this.bullMqService.resumeWorker();

    if (process.env.NODE_ENV === 'test') {
      await this.bullMqService.waitUntilWorkerIsReady();
    }

    if (this.sqsConsumer?.getStatus().isPaused) {
      await this.sqsConsumer.resume();
    }

    Logger.log({ topic: this.topic, backends: this.describeBackends() }, 'Worker resumed', LOG_CONTEXT);
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
