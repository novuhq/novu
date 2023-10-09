import { JobTopicNameEnum } from '@novu/shared';
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

  constructor(public readonly topic: JobTopicNameEnum) {
    this.instance = new BullMqService();
  }

  public get bullMqService(): BullMqService {
    return this.instance;
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

  public async gracefulShutdown(): Promise<void> {
    Logger.log(`Shutting the ${this.topic} queue service down`, LOG_CONTEXT);

    this.queue = undefined;
    await this.instance.gracefulShutdown();

    Logger.log(
      `Shutting down the ${this.topic} queue service has finished`,
      LOG_CONTEXT
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }

  public async addMinimalJob(
    id: string,
    data?: any,
    groupId?: string,
    options: JobsOptions = {}
  ) {
    const jobData = data
      ? {
          _environmentId: data._environmentId,
          _id: id,
          _organizationId: data._organizationId,
          _userId: data._userId,
        }
      : undefined;

    await this.add(id, jobData, groupId, {
      removeOnComplete: true,
      removeOnFail: true,
      ...options,
    });
  }

  public async add(
    name: string,
    data?: any,
    groupId?: string,
    options: JobsOptions = {}
  ) {
    const jobOptions = {
      removeOnComplete: true,
      removeOnFail: true,
      ...options,
    };

    await this.instance.add(name, data, jobOptions, groupId);
  }
  public async addBulk(
    data: [
      {
        name: string;
        data: any;
        options: BulkJobOptions;
        groupId?: string;
      }
    ]
  ) {
    await this.instance.addBulk(data);
  }
}
