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
  public readonly topic: JobTopicNameEnum;

  constructor() {
    this.topic = JobTopicNameEnum.STANDARD;
    this.instance = new OldInstanceBullMqService();
    Logger.log(`Worker ${this.topic} instantiated`, LOG_CONTEXT);
  }

  public get bullMqService(): OldInstanceBullMqService {
    return this.instance;
  }

  public get worker(): Worker {
    return this.instance.worker;
  }

  public initWorker(processor: WorkerProcessor, options?: WorkerOptions): void {
    Logger.verbose(
      { enabled: this.instance.enabled, options },
      'Old Instance Worker is enabled?',
      LOG_CONTEXT
    );
    if (this.instance.enabled) {
      Logger.log(`Worker ${this.topic} initialized`, LOG_CONTEXT);

      this.createWorker(processor, options);
    }
  }

  public createWorker(
    processor: WorkerProcessor,
    options: WorkerOptions
  ): void {
    if (this.instance.enabled) {
      this.instance.createWorker(this.topic, processor, options);
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
      Logger.verbose(
        { instanceEnabled: this.instance.enabled },
        'Pausing the old instance workflow worker',
        LOG_CONTEXT
      );

      await this.instance.pauseWorker();

      Logger.verbose(
        {
          instanceEnabled: this.instance.enabled,
          isPaused: await this.isPaused(),
          isRunning: await this.isRunning(),
        },
        'Paused the old instance workflow worker?',
        LOG_CONTEXT
      );
    }
  }

  public async resume(): Promise<void> {
    Logger.verbose({ instanceEnabled: this.instance.enabled }, LOG_CONTEXT);
    if (this.instance.enabled && this.worker) {
      await this.instance.resumeWorker();
      Logger.verbose(
        {
          isRunning: await this.isRunning(),
          isPaused: await this.isPaused(),
          metrics: await this.instance.getQueueMetrics(),
          jobs: await this.instance.queue?.getJobs(),
        },
        'After resuming the old instance workflow worker service',
        LOG_CONTEXT
      );
    }
  }

  public async gracefulShutdown(): Promise<void> {
    if (this.instance.enabled) {
      Logger.log('Shutting the Worker service down', LOG_CONTEXT);

      await this.instance.gracefulShutdown();

      Logger.log('Shutting down the Worker service has finished', LOG_CONTEXT);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
