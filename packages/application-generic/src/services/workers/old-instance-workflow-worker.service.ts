import { IJobData, JobTopicNameEnum } from '@novu/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  JobsOptions,
  OldInstanceBullMqService,
  Processor,
  Worker,
  WorkerOptions,
} from '../bull-mq';

const LOG_CONTEXT = 'OldInstanceWorkflowWorkerService';

type WorkerProcessor = string | Processor<any, unknown, string> | undefined;

/**
 * TODO: Temporary for migration to MemoryDB
 */
export class OldInstanceWorkflowWorkerService {
  private instance: OldInstanceBullMqService;

  public readonly DEFAULT_ATTEMPTS = 3;
  public readonly topic: JobTopicNameEnum;

  constructor() {
    this.topic = JobTopicNameEnum.WORKFLOW;
    this.instance = new OldInstanceBullMqService();
    if (this.instance.enabled) {
      Logger.log(`Worker ${this.topic} instantiated`, LOG_CONTEXT);
    } else {
      Logger.warn(
        `Old instance workflow worker not instantiated as it is only needed for MemoryDB migration`,
        LOG_CONTEXT
      );
    }
  }

  public get bullMqService(): OldInstanceBullMqService {
    return this.instance;
  }

  public get worker(): Worker {
    return this.instance.worker;
  }

  public initWorker(processor: WorkerProcessor, options?: WorkerOptions): void {
    if (this.instance.enabled) {
      this.createWorker(processor, options);
    }
  }

  public createWorker(
    processor: WorkerProcessor,
    options: WorkerOptions
  ): void {
    if (this.instance.enabled) {
      this.instance.createWorker(this.topic, processor, options);
    } else {
      Logger.log(
        { enabled: this.instance.enabled },
        'We are not running OldInstanceWorkflowWorkerService as it is not needed in this environment',
        LOG_CONTEXT
      );
    }
  }

  public async isRunning(): Promise<boolean> {
    return await this.instance.isWorkerRunning();
  }

  public async isPaused(): Promise<boolean> {
    return await this.instance.isWorkerPaused();
  }

  public async pause(): Promise<void> {
    if (this.instance.enabled && this.worker) {
      await this.instance.pauseWorker();
    }
  }

  public async resume(): Promise<void> {
    if (this.instance.enabled && this.worker) {
      await this.instance.resumeWorker();
    }
  }

  public async gracefulShutdown(): Promise<void> {
    if (this.instance.enabled) {
      Logger.log(
        'Shutting the old instance workflow worker service down',
        LOG_CONTEXT
      );

      await this.instance.gracefulShutdown();

      Logger.log(
        'Shutting down the old instance workflow worker service has finished',
        LOG_CONTEXT
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
