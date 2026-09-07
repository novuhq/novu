import { Logger, OnModuleDestroy } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';
import { ApiServiceLevelEnum, FeatureFlagsKeysEnum, JobTopicNameEnum, QueueBackendMode } from '@novu/shared';
import { PinoLogger } from '../../logging';

import { BulkJobOptions, BullMqService, JobsOptions, Queue, QueueOptions } from '../bull-mq';
import { FeatureFlagsService } from '../feature-flags';
import { DeferReasonEnum, EventBridgeSchedulerService } from '../scheduler';
import { isSqsPartialSendError, SqsService } from '../sqs';
import { SQS_MAX_DELAY_SECONDS } from '../sqs/types';

const LOG_CONTEXT = 'QueueService';

/**
 * Carries the jobs that never reached SQS (or the scheduler) so a fallback can
 * re-queue exactly those. Without it a mid-batch failure forces the caller to
 * re-send everything, double-delivering whatever SQS already accepted.
 */
class PartialDispatchError extends Error {
  constructor(
    public readonly unsentJobs: (IJobParams | IBulkJobParams)[],
    public readonly cause: unknown
  ) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'PartialDispatchError';
  }
}

/**
 * Names to alert on, outermost first. The chain is two deep for the common case
 * (`PartialDispatchError` -> `SqsPartialSendError` -> `BatchRequestTooLong`),
 * so a single unwrap would surface only our own wrapper and never the AWS error
 * that actually explains the failure.
 */
function resolveErrorNames(error: unknown): string | undefined {
  const names: string[] = [];

  for (let current = error; current instanceof Error; current = (current as { cause?: unknown }).cause) {
    names.push(current.name);
  }

  return names.length > 0 ? names.join(' <- ') : undefined;
}

/**
 * The jobs to hand back to the fallback after a failed SQS send.
 *
 * A partial send names the messages it did not deliver; anything else tells us
 * nothing, so we assume the whole SQS leg failed. Either way the result is
 * scoped to `sqsEligible` - never the caller's full job list, which may include
 * schedules that were already accepted.
 */
function resolveUnsentJobs(
  error: unknown,
  sqsEligible: (IJobParams | IBulkJobParams)[],
  jobsByMessageId: Map<string, IJobParams | IBulkJobParams>
): (IJobParams | IBulkJobParams)[] {
  if (!isSqsPartialSendError(error)) {
    return sqsEligible;
  }

  const unsentJobs = error.unsentMessages.map((message) => jobsByMessageId.get(message.id));

  /*
   * Ids are assigned and mapped in the same pass, so a miss is impossible
   * today. Fail open rather than filtering: re-queuing a job that SQS already
   * accepted is recoverable, silently dropping one is not.
   */
  if (unsentJobs.some((job) => job === undefined)) {
    Logger.error(
      { unsentCount: error.unsentMessages.length, eligibleCount: sqsEligible.length },
      'Could not map every unsent SQS message back to its job, re-queuing the full batch',
      LOG_CONTEXT
    );

    return sqsEligible;
  }

  return unsentJobs as (IJobParams | IBulkJobParams)[];
}

type OrganizationRouting = { _id: string; apiServiceLevel?: ApiServiceLevelEnum };

/** The per-organization decisions `add` and `addBulk` share, resolved once per call. */
interface IQueueRouting {
  organization: OrganizationRouting;
  backendMode: string;
}

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

    const routing = await this.resolveRouting(organizationId);
    if (!routing) {
      return;
    }

    return await this.dispatch([params], routing);
  }

  /**
   * Resolves every per-organization routing decision in one place so `add` and
   * `addBulk` cannot drift apart. Returns undefined when the organization
   * cannot be read, which callers treat as "skip the job".
   */
  private async resolveRouting(organizationId: string): Promise<IQueueRouting | undefined> {
    const organization = await this.findOrganization(organizationId);
    if (!organization) {
      return undefined;
    }

    const backendMode = await this.getQueueBackendMode(organization);

    Logger.debug({ topic: this.topic, backendMode, organizationId }, 'Queue backend mode evaluation', LOG_CONTEXT);

    return { organization, backendMode };
  }

  /**
   * The single gate for long delays. SQS caps a per-message delay at 900s, so
   * anything longer can only reach the queue through EventBridge Scheduler;
   * until that is enabled for the organization such jobs keep going to BullMQ
   * as they always have. Everything past this point may assume a long-delayed
   * job is allowed to be scheduled.
   */
  private async dispatch(jobs: (IJobParams | IBulkJobParams)[], routing: IQueueRouting): Promise<void> {
    const { longDelayed, sqsEligible } = this.separateByDelay(jobs);

    // Evaluated only when it can change the outcome, keeping the common
    // short-delay path down to a single flag lookup.
    if (longDelayed.length === 0 || (await this.isSchedulerEnabled(routing.organization))) {
      return await this.routeByMode(jobs, routing);
    }

    Logger.debug(
      { topic: this.topic, count: longDelayed.length },
      'Job delay exceeds SQS max (15min) and EventBridge Scheduler is off, routing to BullMQ',
      LOG_CONTEXT
    );
    await this.addJobsToBullMQ(longDelayed);

    if (sqsEligible.length === 0) {
      return;
    }

    return await this.routeByMode(sqsEligible, routing);
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

  private async routeByMode(jobs: (IJobParams | IBulkJobParams)[], routing: IQueueRouting): Promise<void> {
    const { backendMode: queueBackendMode } = routing;
    const organizationId = routing.organization._id;

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
          await this.fallbackToBullMQ(error, jobs, 'SQS failed in LIVE mode, falling back to BullMQ as primary');
        }
        break;
      }

      case QueueBackendMode.COMPLETE: {
        try {
          return await this.addJobsToSQS(jobs, organizationId);
        } catch (error) {
          return await this.fallbackToBullMQ(error, jobs, 'SQS failed in COMPLETE mode, falling back to BullMQ');
        }
      }

      default:
        Logger.warn({ mode: queueBackendMode }, 'Unknown queue backend mode, falling back to BullMQ', LOG_CONTEXT);
        return await this.addJobsToBullMQ(jobs);
    }
  }

  /**
   * Hand the jobs SQS did not take over to BullMQ.
   *
   * Only the undelivered jobs are re-queued when the failure identified them,
   * which is what stops a mid-batch failure from double-delivering everything
   * SQS already accepted.
   */
  private async fallbackToBullMQ(error: unknown, jobs: (IJobParams | IBulkJobParams)[], reason: string): Promise<void> {
    const fallbackJobs = error instanceof PartialDispatchError ? error.unsentJobs : jobs;

    Logger.error(
      {
        topic: this.topic,
        count: jobs.length,
        fallbackCount: fallbackJobs.length,
        error: error instanceof Error ? error.message : String(error),
        errorName: resolveErrorNames(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      reason,
      LOG_CONTEXT
    );

    if (fallbackJobs.length === 0) {
      return;
    }

    await this.addJobsToBullMQ(fallbackJobs);
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
     * Transport detail, not policy: `dispatch` has already decided these jobs
     * may use the scheduler, and all this picks is which AWS call delivers
     * them. Splitting here rather than above keeps long delays inside the
     * mode's existing BullMQ fallback, since a schedule is just a deferred
     * send to this same queue.
     */
    const { longDelayed, sqsEligible } = this.separateByDelay(jobs);

    if (longDelayed.length > 0) {
      try {
        await this.addJobsToScheduler(longDelayed, organizationId);
      } catch (error) {
        /*
         * Nothing has been sent to SQS yet, so the eligible jobs are unsent too
         * - they are never attempted once this throws.
         */
        const unsentScheduled = error instanceof PartialDispatchError ? error.unsentJobs : longDelayed;
        throw new PartialDispatchError([...unsentScheduled, ...sqsEligible], error);
      }
    }

    if (sqsEligible.length === 0) {
      return;
    }

    /*
     * Keep the id -> job mapping rather than parsing the id back apart: it is
     * how a partial send is translated into the exact jobs to re-queue.
     */
    const jobsByMessageId = new Map<string, IJobParams | IBulkJobParams>();
    const messages = sqsEligible.map((job, index) => {
      const id = `${job.groupId || job.name}-${index}`;
      jobsByMessageId.set(id, job);

      return {
        id,
        body: JSON.stringify(job.data || {}),
        groupId: organizationId,
        delaySeconds: Math.ceil((job.options?.delay || 0) / 1000),
      };
    });

    try {
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
    } catch (error) {
      /*
       * Scope the fallback to the SQS leg even when the error does not name the
       * undelivered messages. Anything already handed to the scheduler above
       * has been accepted, so replaying the whole `jobs` array here would fire
       * those a second time - once via EventBridge and once via BullMQ.
       */
      throw new PartialDispatchError(resolveUnsentJobs(error, sqsEligible, jobsByMessageId), error);
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

    const results = await Promise.allSettled(
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

    const rejected = results.flatMap((result, index) => (result.status === 'rejected' ? [{ result, index }] : []));

    if (rejected.length > 0) {
      Logger.error(
        {
          topic: this.topic,
          organizationId,
          totalCount: jobs.length,
          scheduledCount: jobs.length - rejected.length,
          unscheduledCount: rejected.length,
          error: rejected.map(({ result }) => String(result.reason)).join('; '),
        },
        'Some long-delayed jobs could not be scheduled',
        LOG_CONTEXT
      );

      throw new PartialDispatchError(
        rejected.map(({ index }) => jobs[index]),
        rejected[0].result.reason
      );
    }

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

    const routing = await this.resolveRouting(organizationId);
    if (!routing) {
      return;
    }

    return await this.dispatch(data, routing);
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
