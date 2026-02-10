import { Logger, OnModuleDestroy } from '@nestjs/common';
import { IJobData, JobTopicNameEnum } from '@novu/shared';

import { BulkJobOptions, BullMqService, JobsOptions, Queue, QueueOptions } from '../bull-mq';

const LOG_CONTEXT = 'QueueService';

export class QueueBaseService implements OnModuleDestroy {
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

    Logger.log(`Shutting down the ${this.topic} queue service has finished`, LOG_CONTEXT);
  }

  public async add(params: IJobParams) {
    const jobOptions = {
      removeOnComplete: true,
      removeOnFail: true,
      ...params.options,
    };

    const payloadSize = this.calculatePayloadSize(params.data);
    Logger.debug(
      `Adding job to queue. Topic: ${this.topic}, Job: ${params.name}, Payload size: ${payloadSize} bytes`,
      LOG_CONTEXT
    );

    await this.instance.add(params.name, params.data, jobOptions, params.groupId);
  }

  public async addBulk(data: IBulkJobParams[]) {
    const payloadSizes = data.map((item) => this.calculatePayloadSize(item.data));
    const validSizes = payloadSizes.filter((size) => size >= 0);
    const totalPayloadSize = validSizes.reduce((sum, size) => sum + size, 0);
    const avgPayloadSize = validSizes.length > 0 ? Math.round(totalPayloadSize / validSizes.length) : 0;

    const failedSerializationCount = payloadSizes.length - validSizes.length;
    if (failedSerializationCount > 0) {
      Logger.warn(
        `Failed to serialize ${failedSerializationCount} out of ${data.length} items when calculating payload sizes`,
        LOG_CONTEXT
      );
    }

    Logger.debug(
      `Adding bulk jobs to queue. Topic: ${this.topic}, Count: ${data.length}, Total payload size: ${totalPayloadSize} bytes, Avg payload size: ${avgPayloadSize} bytes`,
      LOG_CONTEXT
    );

    await this.instance.addBulk(data);
  }

  private calculatePayloadSize(data: any): number {
    if (!data) return 0;

    try {
      return Buffer.byteLength(JSON.stringify(data), 'utf8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Logger.warn(`Failed to calculate payload size: ${errorMessage}`, LOG_CONTEXT);

      return -1;
    }
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
