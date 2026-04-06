import { Logger, OnModuleDestroy } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';
import { ApiServiceLevelEnum, FeatureFlagsKeysEnum, JobTopicNameEnum, QueueBackendMode } from '@novu/shared';
import { PinoLogger } from '../../logging';

import { BulkJobOptions, BullMqService, JobsOptions, Queue, QueueOptions } from '../bull-mq';
import { FeatureFlagsService } from '../feature-flags';
import { SqsService } from '../sqs';
import { SQS_MAX_DELAY_SECONDS } from '../sqs/types';

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
    protected organizationRepository?: CommunityOrganizationRepository,
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
    const queue = this.bullMqService.queue as any;

    if (!queue) return 0;

    /*
     * getGroupsJobsCount is only available in BullMQ Pro Edition, so we fallback to getWaitingCount if it's not available.
     */
    if (typeof queue.getGroupsJobsCount !== 'function') {
      return await this.bullMqService.queue.getWaitingCount();
    }

    return await queue.getGroupsJobsCount();
  }

  public async getWaitingCount() {
    if (!this.bullMqService.queue) return 0;

    return await this.bullMqService.queue.getWaitingCount();
  }

  public async getDelayedCount() {
    if (!this.bullMqService.queue) return 0;

    return await this.bullMqService.queue.getDelayedCount();
  }

  public async getActiveCount() {
    if (!this.bullMqService.queue) return 0;

    return await this.bullMqService.queue.getActiveCount();
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log({ topic: this.topic }, 'Shutting down queue service', LOG_CONTEXT);

    this.queue = undefined;
    await this.bullMqService.gracefulShutdown();

    Logger.log({ topic: this.topic }, 'Queue service shutdown complete', LOG_CONTEXT);
  }

  public async add(params: IJobParams) {
    const delayMs = params.options?.delay || 0;

    if (delayMs > SQS_MAX_DELAY_SECONDS * 1000) {
      Logger.log(
        { topic: this.topic, delay: delayMs },
        'Job delay exceeds SQS max (15min), routing to BullMQ',
        LOG_CONTEXT
      );

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
      Logger.debug({ topic: this.topic }, 'Job without organization ID, routing to BullMQ fallback', LOG_CONTEXT);

      return await this.addToBullMQ(params);
    }

    const queueBackendMode = await this.getQueueBackendMode(organizationId);
    if (queueBackendMode === null) {
      return;
    }

    Logger.debug({ topic: this.topic, queueBackendMode, organizationId }, 'Queue backend mode evaluation', LOG_CONTEXT);

    return await this.routeByMode([params], queueBackendMode, organizationId);
  }

  private async getQueueBackendMode(organizationId: string): Promise<string | null> {
    let organization: { _id: string; apiServiceLevel?: ApiServiceLevelEnum } | undefined;
    try {
      organization = await this.organizationRepository?.findOne({ _id: organizationId }, 'apiServiceLevel', {
        readPreference: 'secondaryPreferred',
      });
    } catch (error) {
      Logger.warn(
        { organizationId, error: error instanceof Error ? error.message : String(error) },
        'Failed to fetch organization for queue backend mode flag',
        LOG_CONTEXT
      );
    }

    /*
     * If the organization is not found, we return null to indicate that the job should be skipped.
     * There is no point in trying to route the job to SQS or BullMQ if the organization is not found.
     */

    if (!organization) {
      Logger.warn({ organizationId, topic: this.topic }, 'Organization not found, skipping job', LOG_CONTEXT);

      return null;
    }

    return await this.featureFlagsService.getFlag<string>({
      key: FeatureFlagsKeysEnum.QUEUE_BACKEND_MODE,
      defaultValue: QueueBackendMode.BULLMQ,
      organization: { _id: organizationId, apiServiceLevel: organization.apiServiceLevel },
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
      delaySeconds: Math.ceil((job.options?.delay || 0) / 1000),
    }));

    if (messages.length === 1) {
      await this.sqsService.send(this.topic, messages[0]);
      Logger.debug(
        { topic: this.topic, jobName: jobs[0].name, payloadSizeBytes: this.calculatePayloadSize(jobs[0].data) },
        'Added job to SQS',
        LOG_CONTEXT
      );
    } else {
      await this.sqsService.sendBulk(this.topic, messages);
      Logger.debug({ topic: this.topic, count: messages.length }, 'Added bulk jobs to SQS', LOG_CONTEXT);
    }
  }

  protected async addToBullMQ(params: IJobParams) {
    const jobOptions = {
      removeOnComplete: true,
      removeOnFail: true,
      ...params.options,
    };

    const payloadSize = this.calculatePayloadSize(params.data);
    Logger.debug(
      { topic: this.topic, jobName: params.name, payloadSizeBytes: payloadSize },
      'Adding job to BullMQ queue',
      LOG_CONTEXT
    );

    await this.bullMqService.add(params.name, params.data, jobOptions, params.groupId);
  }

  public async addBulk(data: IBulkJobParams[]) {
    this.logBulkPayloadMetrics(data);

    if (!this.sqsService || !this.featureFlagsService) {
      return await this.bullMqService.addBulk(data);
    }

    const { longDelayed, sqsEligible } = this.separateByDelay(data);

    if (longDelayed.length > 0) {
      Logger.debug(
        { topic: this.topic, count: longDelayed.length },
        'Routing long-delayed jobs (>15min) to BullMQ',
        LOG_CONTEXT
      );
      await this.bullMqService.addBulk(longDelayed);
    }

    if (sqsEligible.length > 0) {
      const organizationId = sqsEligible[0]?.groupId;

      if (!organizationId) {
        Logger.debug(
          { topic: this.topic, count: sqsEligible.length },
          'Jobs without organization ID, routing to BullMQ fallback',
          LOG_CONTEXT
        );
        await this.addJobsToBullMQ(sqsEligible);

        return;
      }

      const queueBackendMode = await this.getQueueBackendMode(organizationId);
      if (queueBackendMode === null) {
        return;
      }

      await this.routeByMode(sqsEligible, queueBackendMode, organizationId);
    }
  }

  private separateByDelay(jobs: IBulkJobParams[]): {
    longDelayed: IBulkJobParams[];
    sqsEligible: IBulkJobParams[];
  } {
    const longDelayed: IBulkJobParams[] = [];
    const sqsEligible: IBulkJobParams[] = [];

    for (const job of jobs) {
      const delayMs = job.options?.delay || 0;
      if (delayMs > SQS_MAX_DELAY_SECONDS * 1000) {
        longDelayed.push(job);
      } else {
        sqsEligible.push(job);
      }
    }

    return { longDelayed, sqsEligible };
  }

  private logBulkPayloadMetrics(data: IBulkJobParams[]): void {
    const payloadSizes = data.map((item) => this.calculatePayloadSize(item.data));
    const validSizes = payloadSizes.filter((size) => size >= 0);
    const totalPayloadSize = validSizes.reduce((sum, size) => sum + size, 0);
    const avgPayloadSize = validSizes.length > 0 ? Math.round(totalPayloadSize / validSizes.length) : 0;

    const failedCount = payloadSizes.length - validSizes.length;
    if (failedCount > 0) {
      Logger.warn(
        { topic: this.topic, failedCount, totalCount: data.length },
        'Failed to serialize bulk job items',
        LOG_CONTEXT
      );
    }

    Logger.debug(
      {
        topic: this.topic,
        count: data.length,
        totalSizeBytes: totalPayloadSize,
        avgSizeBytes: avgPayloadSize,
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
      Logger.warn({ error: errorMessage }, 'Failed to calculate payload size', LOG_CONTEXT);

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
