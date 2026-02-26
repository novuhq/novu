import { Logger, OnModuleDestroy } from '@nestjs/common';
import { FeatureFlagsKeysEnum, JobTopicNameEnum, QueueBackendMode } from '@novu/shared';
import { PinoLogger } from '../../logging';

import { BulkJobOptions, BullMqService, JobsOptions, Queue, QueueOptions } from '../bull-mq';
import { FeatureFlagsService } from '../feature-flags';
import { SqsService } from '../sqs';

const LOG_CONTEXT = 'QueueService';

export class QueueBaseService implements OnModuleDestroy {
  private bullMqService: BullMqService;

  public readonly DEFAULT_ATTEMPTS = 3;
  public queue: Queue;

  constructor(
    public readonly topic: JobTopicNameEnum,
    bullMqService: BullMqService,
    protected sqsService?: SqsService,
    protected featureFlagsService?: FeatureFlagsService,
    protected logger?: PinoLogger
  ) {
    this.bullMqService = bullMqService;
    if (logger) {
      this.logger.setContext(LOG_CONTEXT);
    }
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

    this.queue = this.bullMqService.createQueue(this.topic, options);
  }

  private getQueueOptions(): QueueOptions {
    return {
      defaultJobOptions: {
        removeOnComplete: true,
      },
    };
  }

  public isReady(): boolean {
    return this.bullMqService.isClientReady();
  }

  public async isPaused(): Promise<boolean> {
    return await this.bullMqService.isQueuePaused();
  }

  public async getStatus() {
    return await this.bullMqService.getStatus();
  }

  public async getGroupsJobsCount() {
    return await (this.bullMqService.queue as any).getGroupsJobsCount();
  }

  public async getWaitingCount() {
    return await this.bullMqService.queue.getWaitingCount();
  }

  public async getDelayedCount() {
    return await this.bullMqService.queue.getDelayedCount();
  }

  public async getActiveCount() {
    return await this.bullMqService.queue.getActiveCount();
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log(`Shutting the ${this.topic} queue service down`, LOG_CONTEXT);

    this.queue = undefined;
    await this.bullMqService.gracefulShutdown();

    Logger.log(`Shutting down the ${this.topic} queue service has finished`, LOG_CONTEXT);
  }

  public async add(params: IJobParams) {
    if (params.options?.delay > 0) {
      Logger.log({ topic: this.topic, delay: params.options.delay }, 'Job has delay, routing to BullMQ', LOG_CONTEXT);
      return await this.addToBullMQ(params);
    }

    if (!this.sqsService || !this.featureFlagsService) {
      return await this.addToBullMQ(params);
    }

    /*
     * During the migration, we know groupId is organizationId.
     * After the migration is complete, we won't need feature flag for queue backend mode.
     * Then we will use groupId for all scenarios.
     * This currently being only applied when SQS is enabled for certain topic.
     * */
    const organizationId = params.groupId;

    if (!organizationId) {
      Logger.log({ topic: this.topic }, 'Job without organization ID, routing to BullMQ fallback', LOG_CONTEXT);
      return await this.addToBullMQ(params);
    }

    const queueBackendMode = await this.getQueueBackendMode(organizationId);

    Logger.log({ topic: this.topic, queueBackendMode, organizationId }, 'Queue backend mode evaluation', LOG_CONTEXT);

    return await this.routeByMode([params], queueBackendMode, organizationId);
  }

  private async getQueueBackendMode(organizationId: string): Promise<string> {
    return await this.featureFlagsService.getFlag<string>({
      key: FeatureFlagsKeysEnum.QUEUE_BACKEND_MODE,
      defaultValue: QueueBackendMode.BULLMQ,
      organization: { _id: organizationId },
    });
  }

  private markAsSkipProcessing(jobs: (IJobParams | IBulkJobParams)[]): (IJobParams | IBulkJobParams)[] {
    return jobs.map((job) => ({ ...job, data: { ...job.data, skipProcessing: true } }));
  }

  private async routeByMode(
    jobs: (IJobParams | IBulkJobParams)[],
    queueBackendMode: string,
    organizationId: string
  ): Promise<void> {
    switch (queueBackendMode) {
      case QueueBackendMode.BULLMQ:
        return await this.addJobsToBullMQ(jobs);

      case QueueBackendMode.SHADOW: {
        await this.addJobsToBullMQ(jobs);
        try {
          await this.addJobsToSQS(this.markAsSkipProcessing(jobs), organizationId);
        } catch (error) {
          this.logger?.warn(
            { error: error instanceof Error ? error.message : String(error) },
            'SQS failed in shadow mode, but BullMQ job was added successfully'
          );
        }
        break;
      }

      case QueueBackendMode.LIVE: {
        try {
          await this.addJobsToSQS(jobs, organizationId);

          try {
            await this.addJobsToBullMQ(this.markAsSkipProcessing(jobs));
          } catch (bullmqError) {
            Logger.warn(
              {
                topic: this.topic,
                count: jobs.length,
                error: bullmqError instanceof Error ? bullmqError.message : String(bullmqError),
                stack: bullmqError instanceof Error ? bullmqError.stack : undefined,
              },
              'BullMQ fallback failed in LIVE mode after successful SQS push',
              LOG_CONTEXT
            );
          }
        } catch (error) {
          Logger.error(
            {
              topic: this.topic,
              count: jobs.length,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
            'SQS failed in LIVE mode, falling back to BullMQ as primary',
            LOG_CONTEXT
          );
          await this.addJobsToBullMQ(jobs);
        }
        break;
      }

      case QueueBackendMode.COMPLETE: {
        try {
          return await this.addJobsToSQS(jobs, organizationId);
        } catch (error) {
          // SQS failed in COMPLETE mode - fall back to BullMQ for resilience
          Logger.error(
            {
              topic: this.topic,
              count: jobs.length,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
            'SQS failed in COMPLETE mode, falling back to BullMQ',
            LOG_CONTEXT
          );
          return await this.addJobsToBullMQ(jobs);
        }
      }

      default:
        Logger.warn({ mode: queueBackendMode }, 'Unknown queue backend mode, falling back to BullMQ', LOG_CONTEXT);
        return await this.addJobsToBullMQ(jobs);
    }
  }

  private toBulkJobParams(jobs: (IJobParams | IBulkJobParams)[]): IBulkJobParams[] {
    return jobs.map((job) => ({
      name: job.name,
      data: job.data || {},
      groupId: job.groupId,
      options: job.options,
    }));
  }

  private async addJobsToBullMQ(jobs: (IJobParams | IBulkJobParams)[]): Promise<void> {
    if (jobs.length === 1) {
      return await this.addToBullMQ(jobs[0] as IJobParams);
    }
    await this.bullMqService.addBulk(this.toBulkJobParams(jobs));
  }

  private async addJobsToSQS(jobs: (IJobParams | IBulkJobParams)[], organizationId: string): Promise<void> {
    const messages = jobs.map((job, index) => ({
      id: `${job.groupId || job.name}-${index}`,
      body: JSON.stringify(job.data || {}),
      groupId: organizationId,
    }));

    if (messages.length === 1) {
      await this.sqsService.send(this.topic, messages[0]);
      Logger.log(
        `Added job to SQS. Topic: ${this.topic}, Job: ${jobs[0].name}, Size: ${this.calculatePayloadSize(jobs[0].data)} bytes`,
        LOG_CONTEXT
      );
    } else {
      await this.sqsService.sendBulk(this.topic, messages);
      Logger.log({ topic: this.topic, count: messages.length }, 'Added bulk jobs to SQS', LOG_CONTEXT);
    }
  }

  protected async addToBullMQ(params: IJobParams) {
    const jobOptions = {
      removeOnComplete: true,
      removeOnFail: true,
      ...params.options,
    };

    const payloadSize = this.calculatePayloadSize(params.data);
    Logger.log(
      `Adding job to BullMQ queue. Topic: ${this.topic}, Job: ${params.name}, Payload size: ${payloadSize} bytes`,
      LOG_CONTEXT
    );

    await this.bullMqService.add(params.name, params.data, jobOptions, params.groupId);
  }

  public async addBulk(data: IBulkJobParams[]) {
    this.logBulkPayloadMetrics(data);

    if (!this.sqsService || !this.featureFlagsService) {
      return await this.bullMqService.addBulk(data);
    }

    const { delayed, immediate } = this.separateByDelay(data);

    if (delayed.length > 0) {
      Logger.log({ topic: this.topic, count: delayed.length }, 'Routing delayed jobs to BullMQ', LOG_CONTEXT);
      await this.bullMqService.addBulk(delayed);
    }

    if (immediate.length > 0) {
      const organizationId = immediate[0]?.groupId;

      if (!organizationId) {
        Logger.log(
          { topic: this.topic, count: immediate.length },
          'Jobs without organization ID, routing to BullMQ fallback',
          LOG_CONTEXT
        );
        await this.addJobsToBullMQ(immediate);

        return;
      }

      const queueBackendMode = await this.getQueueBackendMode(organizationId);
      await this.routeByMode(immediate, queueBackendMode, organizationId);
    }
  }

  private separateByDelay(jobs: IBulkJobParams[]): { delayed: IBulkJobParams[]; immediate: IBulkJobParams[] } {
    const delayed: IBulkJobParams[] = [];
    const immediate: IBulkJobParams[] = [];

    for (const job of jobs) {
      if (job.options?.delay > 0) {
        delayed.push(job);
      } else {
        immediate.push(job);
      }
    }

    return { delayed, immediate };
  }

  private logBulkPayloadMetrics(data: IBulkJobParams[]): void {
    const payloadSizes = data.map((item) => this.calculatePayloadSize(item.data));
    const validSizes = payloadSizes.filter((size) => size >= 0);
    const totalPayloadSize = validSizes.reduce((sum, size) => sum + size, 0);
    const avgPayloadSize = validSizes.length > 0 ? Math.round(totalPayloadSize / validSizes.length) : 0;

    const failedCount = payloadSizes.length - validSizes.length;
    if (failedCount > 0) {
      Logger.warn(`Failed to serialize ${failedCount} out of ${data.length} items`, LOG_CONTEXT);
    }

    Logger.log(
      {
        topic: this.topic,
        count: data.length,
        totalSize: totalPayloadSize,
        avgSize: avgPayloadSize,
      },
      'Adding bulk jobs',
      LOG_CONTEXT
    );
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
