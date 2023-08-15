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

  constructor(public readonly name: JobTopicNameEnum) {
    this.instance = new BullMqService();
  }

  public get bullMqService(): BullMqService {
    return this.instance;
  }

  public createWorker(
    processor: WorkerProcessor,
    options: WorkerOptions
  ): void {
    this.worker = this.instance.createWorker(this.name, processor, options);
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
