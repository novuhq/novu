import { IJobData, JobTopicNameEnum } from '@novu/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  BullMqService,
  JobsOptions,
  Processor,
  Worker,
  WorkerOptions,
} from '../bull-mq';

const LOG_CONTEXT = 'WorkerService';

export type WorkerProcessor =
  | string
  | Processor<any, unknown, string>
  | undefined;

export { WorkerOptions };

export class WorkerBaseService {
  private instance: BullMqService;

  public readonly DEFAULT_ATTEMPTS = 3;
  public worker: Worker;

  constructor(public readonly topic: JobTopicNameEnum) {
    this.instance = new BullMqService();
  }

  public get bullMqService(): BullMqService {
    return this.instance;
  }

  public initWorker(processor: WorkerProcessor, options?: WorkerOptions): void {
    Logger.log(`Worker ${this.topic} initialized`, LOG_CONTEXT);

    this.createWorker(processor, options);
  }

  public createWorker(
    processor: WorkerProcessor,
    options: WorkerOptions
  ): void {
    this.worker = this.instance.createWorker(this.topic, processor, options);
  }

  public async pauseWorker(): Promise<void> {
    if (this.worker) {
      Logger.log(`There is worker ${this.worker.name} to pause`, LOG_CONTEXT);

      try {
        await this.worker.pause();
        Logger.log(`Worker ${this.worker.name} pause succeeded`, LOG_CONTEXT);
      } catch (error) {
        Logger.error(
          error,
          `Worker ${this.worker.name} pause failed`,
          LOG_CONTEXT
        );

        throw error;
      }
    }
  }

  public async resumeWorker(): Promise<void> {
    if (this.worker) {
      Logger.log(`There is worker ${this.worker.name} to resume`, LOG_CONTEXT);

      try {
        await this.worker.resume();
        Logger.log(`Worker ${this.worker.name} resume succeeded`, LOG_CONTEXT);
      } catch (error) {
        Logger.error(
          error,
          `Worker ${this.worker.name} resume failed`,
          LOG_CONTEXT
        );

        throw error;
      }
    }
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log('Shutting the Worker service down', LOG_CONTEXT);

    this.worker = undefined;
    await this.instance.gracefulShutdown();

    Logger.log('Shutting down the Worker service has finished', LOG_CONTEXT);
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
