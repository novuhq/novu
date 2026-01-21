import { Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { PinoLogger } from '../../logging';
import { BullMqService, Processor, Worker, WorkerOptions } from '../bull-mq';
import { INovuWorker } from '../readiness';
import { ISqsConsumerOptions, SqsConsumerService, SqsService } from '../sqs';

const LOG_CONTEXT = 'WorkerService';

export type WorkerProcessor = string | Processor<any, unknown, string> | undefined;

export { WorkerOptions };

export class WorkerBaseService implements INovuWorker {
  private bullMqService: BullMqService;
  private sqsConsumer?: SqsConsumerService;
  private processorFunction?: Processor<any, unknown, string>;

  public readonly DEFAULT_ATTEMPTS = 3;

  constructor(
    public readonly topic: JobTopicNameEnum,
    public bullMqServiceInstance: BullMqService,
    protected sqsService?: SqsService,
    protected logger?: PinoLogger
  ) {
    this.bullMqService = bullMqServiceInstance;
  }

  public get worker(): Worker {
    return this.bullMqService.worker;
  }

  public initWorker(processor: WorkerProcessor, options?: WorkerOptions): void {
    Logger.log(`Worker ${this.topic} initialized`, LOG_CONTEXT);

    if (typeof processor === 'function') {
      this.processorFunction = processor;
      // Wrap processor with skipProcessing check for BullMQ
      const wrappedProcessor = this.wrapProcessorWithSkipCheck(processor);
      this.createWorker(wrappedProcessor, options);
      this.initSqsConsumer(processor, options);
    } else {
      this.createWorker(processor, options);
    }
  }

  private wrapProcessorWithSkipCheck(processor: Processor<any, unknown, string>): Processor<any, unknown, string> {
    return async (job: any) => {
      // Universal skipProcessing check for BullMQ workers
      if (job.data?.skipProcessing) {
        Logger.log(
          {
            topic: this.topic,
            jobId: job.id,
            jobName: job.name,
          },
          'Skipping BullMQ job - skipProcessing flag is set',
          LOG_CONTEXT
        );
        return;
      }

      return await processor(job);
    };
  }

  public createWorker(processor: WorkerProcessor, options: WorkerOptions): void {
    this.bullMqService.createWorker(this.topic, processor, options);
  }

  private initSqsConsumer(processor: Processor<any, unknown, string>, options?: WorkerOptions): void {
    if (!this.sqsService) {
      Logger.debug(`SQS service not configured for ${this.topic}, skipping SQS consumer`, LOG_CONTEXT);
      return;
    }

    if (!this.sqsService.isConfigured(this.topic)) {
      Logger.debug(`SQS queue not configured for ${this.topic}, skipping SQS consumer`, LOG_CONTEXT);
      return;
    }

    const sqsConsumerOptions: ISqsConsumerOptions = {
      maxNumberOfMessages: 10,
      waitTimeSeconds: 20,
      visibilityTimeout: 300,
    };

    const sqsProcessor = async (data: any): Promise<void> => {
      // Universal skipProcessing check for all workers
      if (data.skipProcessing) {
        Logger.log(
          {
            topic: this.topic,
            jobId: data._id || data.identifier || 'unknown',
          },
          'Skipping job - skipProcessing flag is set',
          LOG_CONTEXT
        );
        return;
      }

      const job = {
        data,
        id: data._id || data.identifier || 'unknown',
        name: this.topic,
      };

      await processor(job as any);
    };

    this.sqsConsumer = new SqsConsumerService(
      this.topic,
      this.sqsService,
      sqsProcessor,
      this.logger,
      sqsConsumerOptions
    );

    this.sqsConsumer.start();

    Logger.log(`SQS consumer for ${this.topic} initialized and started`, LOG_CONTEXT);
  }

  public async isRunning(): Promise<boolean> {
    const bullMqRunning = await this.bullMqService.isWorkerRunning();
    const sqsRunning = this.sqsConsumer?.getStatus().isRunning || false;
    return bullMqRunning || sqsRunning;
  }

  public async isPaused(): Promise<boolean> {
    const bullMqPaused = await this.bullMqService.isWorkerPaused();
    const sqsPaused = this.sqsConsumer?.getStatus().isPaused || false;
    return bullMqPaused && sqsPaused;
  }

  public async pause(): Promise<void> {
    if (this.worker) {
      await this.bullMqService.pauseWorker();
    }

    if (this.sqsConsumer) {
      await this.sqsConsumer.pause();
    }

    const backends = this.sqsConsumer ? 'BullMQ and SQS' : 'BullMQ';
    Logger.log(`Worker ${this.topic} paused (${backends})`, LOG_CONTEXT);
  }

  public async resume(): Promise<void> {
    if (this.worker) {
      await this.bullMqService.resumeWorker();
      if (process.env.NODE_ENV === 'test') {
        Logger.log(`Worker ${this.topic} waiting until ready...`, LOG_CONTEXT);
        await this.bullMqService.waitUntilWorkerIsReady();
        Logger.log(`Worker ${this.topic} is now ready to process jobs`, LOG_CONTEXT);
      }
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
