import { Logger, OnModuleDestroy } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';
import { ApiServiceLevelEnum, FeatureFlagsKeysEnum, JobTopicNameEnum, QueueBackendMode } from '@novu/shared';
import { PinoLogger } from '../../logging';

import { BulkJobOptions, BullMqService, JobsOptions, Queue, QueueOptions } from '../bull-mq';
import { FeatureFlagsService } from '../feature-flags';
import { DeferReasonEnum, EventBridgeSchedulerService } from '../scheduler';
import { SqsService } from '../sqs';
import { SQS_MAX_DELAY_SECONDS } from '../sqs/types';

const LOG_CONTEXT = 'QueueService';

type OrganizationRouting = { _id: string; apiServiceLevel?: ApiServiceLevelEnum };

function exceedsSqsDelayCap(delayMs: number | undefined): boolean {
  return (delayMs || 0) > SQS_MAX_DELAY_SECONDS * 1000;
}

/**
 * Mirrors the id BullMQ dedups on, which the producers already make unique per
 * fire (a schedule extension re-queues the same job under `-ext{N}`). Reusing
 * it as the schedule name gives EventBridge the same dedup semantics: a
 * repeated enqueue collides by name instead of creating a second fire.
 */
function resolveScheduleId(job: IJobParams | IBulkJobParams): string {
  return job.options?.jobId || job.data?._id || job.name;
}

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
    protected logger?: PinoLogger,
    protected schedulerService?: EventBridgeSchedulerService
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
    /*
     * When no SQS queue URL is configured for this topic (community edition,
     * self-hosted, or a partially rolled-out deployment), skip the whole
     * routing path - including the organization lookup and feature flag
     * evaluation - and enqueue straight to BullMQ like before the migration.
     */
    if (!this.sqsService?.isConfigured(this.topic) || !this.featureFlagsService) {
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

    const organization = await this.findOrganization(organizationId);
    if (!organization) {
      return;
    }

    const queueBackendMode = await this.getQueueBackendMode(organization);

    /*
     * SQS caps a per-message delay at 900s, so a longer delay can only reach the
     * queue through EventBridge Scheduler. Until that is enabled for the
     * organization, such jobs keep going to BullMQ as they always have.
     */
    if (exceedsSqsDelayCap(params.options?.delay) && !(await this.isSchedulerEnabled(organization))) {
      Logger.log(
        { topic: this.topic, delay: params.options?.delay },
        'Job delay exceeds SQS max (15min) and EventBridge Scheduler is off, routing to BullMQ',
        LOG_CONTEXT
      );

      return await this.addToBullMQ(params);
    }

    Logger.debug({ topic: this.topic, queueBackendMode, organizationId }, 'Queue backend mode evaluation', LOG_CONTEXT);

    return await this.routeByMode([params], queueBackendMode, organizationId);
  }

  /**
   * Returns undefined when the organization cannot be read, which callers treat
   * as "skip the job": if Mongo is unavailable the job cannot be executed
   * downstream either, so enqueueing it anywhere would only defer the failure.
   */
  private async findOrganization(organizationId: string): Promise<OrganizationRouting | undefined> {
    let organization: OrganizationRouting | undefined;
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

    if (!organization) {
      Logger.warn({ organizationId, topic: this.topic }, 'Organization not found, skipping job', LOG_CONTEXT);

      return undefined;
    }

    return organization;
  }

  private async getQueueBackendMode(organization: OrganizationRouting): Promise<string> {
    return await this.featureFlagsService.getFlag<string>({
      key: FeatureFlagsKeysEnum.QUEUE_BACKEND_MODE,
      defaultValue: QueueBackendMode.BULLMQ,
      organization: { _id: organization._id, apiServiceLevel: organization.apiServiceLevel },
    });
  }

  private async isSchedulerEnabled(organization: OrganizationRouting): Promise<boolean> {
    if (!this.schedulerService?.isConfigured(this.topic)) {
      return false;
    }

    return await this.featureFlagsService.getFlag<boolean>({
      key: FeatureFlagsKeysEnum.IS_EVENTBRIDGE_SCHEDULER_ENABLED,
      defaultValue: false,
      organization: { _id: organization._id, apiServiceLevel: organization.apiServiceLevel },
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
    /*
     * A schedule is just a deferred send to this same queue, so splitting here
     * lets long delays inherit whatever the mode already decided - including
     * the BullMQ fallback that wraps every caller of this method.
     */
    const { longDelayed, sqsEligible } = this.separateByDelay(jobs);

    if (longDelayed.length > 0) {
      await this.addJobsToScheduler(longDelayed, organizationId);
    }

    if (sqsEligible.length === 0) {
      return;
    }

    const messages = sqsEligible.map((job, index) => ({
      id: `${job.groupId || job.name}-${index}`,
      body: JSON.stringify(job.data || {}),
      groupId: organizationId,
      delaySeconds: Math.ceil((job.options?.delay || 0) / 1000),
    }));

    if (messages.length === 1) {
      await this.sqsService.send(this.topic, messages[0]);
      Logger.debug(
        {
          topic: this.topic,
          jobName: sqsEligible[0].name,
          payloadSizeBytes: this.calculatePayloadSize(sqsEligible[0].data),
        },
        'Added job to SQS',
        LOG_CONTEXT
      );
    } else {
      await this.sqsService.sendBulk(this.topic, messages);
      Logger.debug({ topic: this.topic, count: messages.length }, 'Added bulk jobs to SQS', LOG_CONTEXT);
    }
  }

  /**
   * Throws when the scheduler is unavailable so the mode's existing catch
   * blocks fall back to BullMQ, which is exactly what should happen to a job
   * that has no other way to be delivered.
   */
  private async addJobsToScheduler(jobs: (IJobParams | IBulkJobParams)[], organizationId: string): Promise<void> {
    if (!this.schedulerService) {
      throw new Error(`EventBridge Scheduler is unavailable for long-delayed jobs on topic: ${this.topic}`);
    }

    const now = Date.now();

    await Promise.all(
      jobs.map((job) =>
        this.schedulerService.createDelayedFire(this.topic, {
          deferReason: job.deferReason || DeferReasonEnum.DELAY,
          fireAt: new Date(now + (job.options?.delay || 0)),
          organizationId,
          scheduleId: resolveScheduleId(job),
          messageBody: JSON.stringify(job.data || {}),
        })
      )
    );

    Logger.log(
      { topic: this.topic, count: jobs.length, organizationId },
      'Scheduled long-delayed jobs through EventBridge Scheduler',
      LOG_CONTEXT
    );
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

    // See add(): unconfigured topics bypass the routing path entirely.
    if (!this.sqsService?.isConfigured(this.topic) || !this.featureFlagsService) {
      return await this.bullMqService.addBulk(data);
    }

    const organizationId = data.find((job) => job.groupId)?.groupId;

    if (!organizationId) {
      Logger.debug(
        { topic: this.topic, count: data.length },
        'Jobs without organization ID, routing to BullMQ fallback',
        LOG_CONTEXT
      );

      return await this.addJobsToBullMQ(data);
    }

    const organization = await this.findOrganization(organizationId);
    if (!organization) {
      return;
    }

    const queueBackendMode = await this.getQueueBackendMode(organization);
    const { longDelayed, sqsEligible } = this.separateByDelay(data);

    // See add(): long delays only reach SQS once EventBridge Scheduler is on.
    if (longDelayed.length > 0 && !(await this.isSchedulerEnabled(organization))) {
      Logger.debug(
        { topic: this.topic, count: longDelayed.length },
        'Routing long-delayed jobs (>15min) to BullMQ',
        LOG_CONTEXT
      );
      await this.addJobsToBullMQ(longDelayed);

      if (sqsEligible.length === 0) {
        return;
      }

      return await this.routeByMode(sqsEligible, queueBackendMode, organizationId);
    }

    return await this.routeByMode(data, queueBackendMode, organizationId);
  }

  private separateByDelay<T extends IJobParams | IBulkJobParams>(
    jobs: T[]
  ): {
    longDelayed: T[];
    sqsEligible: T[];
  } {
    const longDelayed: T[] = [];
    const sqsEligible: T[] = [];

    for (const job of jobs) {
      if (exceedsSqsDelayCap(job.options?.delay)) {
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
  /**
   * Selects the EventBridge schedule group when the delay exceeds the SQS cap.
   * Only meaningful for producers that can defer beyond 900s; ignored otherwise.
   */
  deferReason?: DeferReasonEnum;
}

export interface IBulkJobParams {
  name: string;
  data: any;
  groupId?: string;
  options?: BulkJobOptions;
  deferReason?: DeferReasonEnum;
}
