import { JobTopicNameEnum } from '@novu/shared';
import { Logger } from '@nestjs/common';

import { BullMqService, Processor, Worker, WorkerOptions } from '../bull-mq';
import { INovuWorker } from '../readiness';

const LOG_CONTEXT = 'WorkerService';

export type WorkerProcessor =
  | string
  | Processor<any, unknown, string>
  | undefined;

export { WorkerOptions };

export class WorkerBaseService implements INovuWorker {
  private instance: BullMqService;

  public readonly DEFAULT_ATTEMPTS = 3;

  constructor(
    public readonly topic: JobTopicNameEnum,
    public bullMqServiceInstance: BullMqService
  ) {
    this.instance = bullMqServiceInstance;
  }

  public get worker(): Worker {
    return this.instance.worker;
  }

  public initWorker(processor: WorkerProcessor, options?: WorkerOptions): void {
    Logger.log(`Worker ${this.topic} initialized`, LOG_CONTEXT);

    this.createWorker(processor, options);
  }

  public createWorker(
    processor: WorkerProcessor,
    options: WorkerOptions
  ): void {
    this.instance.createWorker(this.topic, processor, options);
  }

  public async isRunning(): Promise<boolean> {
    return await this.instance.isWorkerRunning();
  }

  public async isPaused(): Promise<boolean> {
    return await this.instance.isWorkerPaused();
  }

  public async pause(): Promise<void> {
    if (this.worker) {
      await this.instance.pauseWorker();
    }
  }

  public async resume(): Promise<void> {
    if (this.worker) {
      await this.instance.resumeWorker();
    }
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log(`Shutting the ${this.topic} worker service down`, LOG_CONTEXT);

    await this.instance.gracefulShutdown();

    Logger.log(
      `Shutting down the ${this.topic} worker service has finished`,
      LOG_CONTEXT
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
