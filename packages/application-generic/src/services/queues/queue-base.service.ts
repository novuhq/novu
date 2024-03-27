import { IJobData, JobTopicNameEnum } from '@novu/shared';
import { Logger } from '@nestjs/common';

import {
  BullMqService,
  JobsOptions,
  BulkJobOptions,
  Queue,
  QueueOptions,
} from '../bull-mq';

const LOG_CONTEXT = 'QueueService';

export class QueueBaseService {
  private instance: BullMqService;

  public readonly DEFAULT_ATTEMPTS = 3;
  public queue: Queue;

  constructor(
    public readonly topic: JobTopicNameEnum,
    private bullMqService: BullMqService
  ) {
    this.instance = bullMqService;
  }

  public createQueue(overrideOptions?: QueueOptions): void {
    const options = {
      ...this.getQueueOptions(),
      ...(overrideOptions && {
        defaultJobOptions: {
          ...this.getQueueOptions().defaultJobOptions,
          ...overrideOptions.defaultJobOptions,
        },
      }),
    };

    this.queue = this.instance.createQueue(this.topic, options);
  }

  private getQueueOptions(): QueueOptions {
    return {
      defaultJobOptions: {
        removeOnComplete: true,
      },
    };
  }

  public isReady(): boolean {
    return this.instance.isClientReady();
  }

  public async isPaused(): Promise<boolean> {
    return await this.instance.isQueuePaused();
  }

  public async getStatus() {
    return await this.instance.getStatus();
  }

  public async getGroupsJobsCount() {
    return await (this.instance.queue as any).getGroupsJobsCount();
  }

  public async getWaitingCount() {
    return await this.instance.queue.getWaitingCount();
  }

  public async getDelayedCount() {
    return await this.instance.queue.getDelayedCount();
  }

  public async getActiveCount() {
    return await this.instance.queue.getActiveCount();
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log(`Shutting the ${this.topic} queue service down`, LOG_CONTEXT);

    this.queue = undefined;
    await this.instance.gracefulShutdown();

    Logger.log(
      `Shutting down the ${this.topic} queue service has finished`,
      LOG_CONTEXT
    );
  }

  public async add(params: IJobParams) {
    const jobOptions = {
      removeOnComplete: true,
      removeOnFail: true,
      ...params.options,
    };

    await this.instance.add(
      params.name,
      params.data,
      jobOptions,
      params.groupId
    );
  }

  public async addBulk(data: IBulkJobParams[]) {
    await this.instance.addBulk(data);
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}

export interface IJobParams {
  name: string;
  data?: any;
  groupId?: string;
  options?: JobsOptions;
}

export interface IBulkJobParams {
  name: string;
  data: any;
  groupId?: string;
  options?: BulkJobOptions;
}
