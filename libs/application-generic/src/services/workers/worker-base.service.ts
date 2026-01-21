import { Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { PinoLogger } from '../../logging';
import { BullMqService, Processor, WorkerOptions } from '../bull-mq';
import { INovuWorker } from '../readiness';
import { ISqsConsumerOptions, SqsConsumerService, SqsService } from '../sqs';

const LOG_CONTEXT = 'WorkerService';

export type WorkerProcessor = string | Processor<any, unknown, string> | undefined;

export { WorkerOptions };

export class WorkerBaseService implements INovuWorker {
  private bullMqService: BullMqService;
  private sqsConsumer?: SqsConsumerService;

  public readonly DEFAULT_ATTEMPTS = 3;

  constructor(
    public readonly topic: JobTopicNameEnum,
    public bullMqServiceInstance: BullMqService,
    protected sqsService?: SqsService,
    protected logger?: PinoLogger
  ) {
    this.bullMqService = bullMqServiceInstance;
  }

  public initWorker(processor: WorkerProcessor, options?: WorkerOptions): void {
    Logger.log(`Worker ${this.topic} initialized`, LOG_CONTEXT);

    if (typeof processor === 'function') {
      this.createWorker(this.wrapForBullMQ(processor), options);
      this.initSqsConsumer(processor, options);
    } else {
      this.createWorker(processor, options);
    }
  }

  private shouldSkipProcessing(data: any, jobId: string): boolean {
    if (data?.skipProcessing) {
      Logger.log({ topic: this.topic, jobId }, 'Skipping job - marked for skip during migration', LOG_CONTEXT);
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
      Logger.log(`SQS consumer for ${this.topic} not configured, skipping initialization`, LOG_CONTEXT);
      return;
    }

    const sqsConsumerOptions: ISqsConsumerOptions = {
      maxNumberOfMessages: 10,
      waitTimeSeconds: 20,
      visibilityTimeout: 300,
    };

    this.sqsConsumer = new SqsConsumerService(
      this.topic,
      this.sqsService,
      this.wrapForSqs(processor),
      this.logger,
      sqsConsumerOptions
    );

    this.sqsConsumer.start();
    Logger.log(`SQS consumer for ${this.topic} initialized and started`, LOG_CONTEXT);
  }

  private wrapForSqs(processor: Processor<any, unknown, string>): (data: any) => Promise<void> {
    return async (data: any): Promise<void> => {
      const jobId = data._id || data.identifier || 'unknown';
      if (this.shouldSkipProcessing(data, jobId)) {
        return;
      }

      await processor({ data, id: jobId, name: this.topic } as any);
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
    Logger.log(`Worker ${this.topic} paused (${backends})`, LOG_CONTEXT);
  }

  public async resume(): Promise<void> {
    await this.bullMqService.resumeWorker();

    if (process.env.NODE_ENV === 'test') {
      Logger.log(`Worker ${this.topic} waiting until ready...`, LOG_CONTEXT);
      await this.bullMqService.waitUntilWorkerIsReady();
      Logger.log(`Worker ${this.topic} is now ready to process jobs`, LOG_CONTEXT);
    }

    if (this.sqsConsumer) {
      await this.sqsConsumer.resume();
    }

    const backends = this.sqsConsumer ? 'BullMQ and SQS' : 'BullMQ';
    Logger.log(`Worker ${this.topic} resumed (${backends})`, LOG_CONTEXT);
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log(`Shutting the ${this.topic} worker service down`, LOG_CONTEXT);

    await this.bullMqService.gracefulShutdown();

    if (this.sqsConsumer) {
      await this.sqsConsumer.stop();
      Logger.log(`SQS consumer for ${this.topic} stopped`, LOG_CONTEXT);
    }

    Logger.log(`Shutting down the ${this.topic} worker service has finished`, LOG_CONTEXT);
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
