import { IJobData, JobTopicNameEnum } from '@novu/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  JobsOptions,
  OldInstanceBullMqService,
  Processor,
  Worker,
  WorkerOptions,
} from '../bull-mq';

const LOG_CONTEXT = 'OldInstanceWorkerService';

type WorkerProcessor = string | Processor<any, unknown, string> | undefined;

/**
 * TODO: Temporary for migration to MemoryDB
 */
export class OldInstanceWorkflowWorkerService {
  private instance: OldInstanceBullMqService;

  public readonly DEFAULT_ATTEMPTS = 3;
  public worker: Worker;
  public readonly name: JobTopicNameEnum;

  constructor() {
    this.name = JobTopicNameEnum.WORKFLOW;
    this.instance = new OldInstanceBullMqService();
  }

  public initWorker(processor: WorkerProcessor, options?: WorkerOptions): void {
    this.createWorker(processor, options);
  }

  public get bullMqService(): OldInstanceBullMqService {
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
