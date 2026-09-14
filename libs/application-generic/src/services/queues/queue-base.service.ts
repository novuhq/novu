import { createHash } from 'node:crypto';

import { Logger, OnModuleDestroy } from '@nestjs/common';
import { JobTopicNameEnum, QueueBackend } from '@novu/shared';
import { isBullMqEnabled, isSqsPrimary } from '../../config';
import { PinoLogger } from '../../logging';

import { BulkJobOptions, BullMqService, JobsOptions, Queue, QueueOptions } from '../bull-mq';
import { DeferReasonEnum, EventBridgeSchedulerService } from '../scheduler';
import { isSqsPartialSendError, SqsService } from '../sqs';
import { SQS_MAX_DELAY_SECONDS } from '../sqs/types';

const LOG_CONTEXT = 'QueueService';

/**
 * Carries the jobs that never reached SQS (or the scheduler) so a fallback can
 * re-queue exactly those. Without it a mid-batch failure forces the caller to
 * re-send everything, double-delivering whatever SQS already accepted.
 *
 * Exported because in `sqs` mode there is no fallback to consume it and the
 * error reaches the caller instead. A caller that retries the whole batch is
 * choosing at-least-once for the jobs SQS already accepted; one that wants to
 * retry only the remainder can narrow to this type and read `unsentJobs`.
 */
export class PartialDispatchError extends Error {
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

  const unsentJobs = error.unsentMessages
    .map((message) => jobsByMessageId.get(message.id))
    .filter((job): job is IJobParams | IBulkJobParams => job !== undefined);

  /*
   * Ids are assigned and mapped in the same pass, so a job that does not map
   * back is not reachable today. Re-queue the whole leg rather than silently
   * dropping it: a duplicate is recoverable, a lost job is not.
   */
  if (unsentJobs.length !== error.unsentMessages.length) {
    return sqsEligible;
  }

  return unsentJobs;
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

/** AWS caps `MessageGroupId` at 128 characters. */
const SQS_MAX_GROUP_ID_LENGTH = 128;

/**
 * A group id can be caller-supplied routing data - inbound mail groups by the
 * email `Message-ID`, which providers do generate past the cap. Hashing keeps
 * the only property grouping needs, that equal inputs map to equal groups.
 */
function toSqsGroupId(resolved: string): string {
  if (resolved.length <= SQS_MAX_GROUP_ID_LENGTH) {
    return resolved;
  }

  return createHash('sha256').update(resolved).digest('hex');
}

/**
 * The tenant a schedule belongs to. EventBridge names every schedule
 * `${organizationId}-${scheduleId}`, which is what keeps schedules enumerable
 * per tenant through `ListSchedules --name-prefix`, and the result has to
 * satisfy AWS's `[0-9a-zA-Z-_.]` pattern and 64-character ceiling.
 *
 * Strict where `resolveGroupId` falls back, because the two values are not
 * interchangeable: a job id would name the schedule `${jobId}-${jobId}` and an
 * inbound-mail message id is not even a legal schedule name. Throwing routes
 * the job through the same failure handling as an unavailable scheduler -
 * BullMQ while it is still there, a surfaced error once it is not.
 */
function resolveTenantId(job: IJobParams | IBulkJobParams): string {
  const tenantId = job.groupId || job.data?._organizationId;

  if (!tenantId) {
    throw new Error(
      `Cannot schedule the long delay on job "${job.name}" without an organization id, ` +
        'because EventBridge schedule names are prefixed by tenant'
    );
  }

  return tenantId;
}

export class QueueBaseService implements OnModuleDestroy {
  private bullMqService: BullMqService;

  public readonly DEFAULT_ATTEMPTS = 3;
  public queue: Queue;

  constructor(
    public readonly topic: JobTopicNameEnum,
    bullMqService: BullMqService,
    protected sqsService?: SqsService,
    protected logger?: PinoLogger,
    protected schedulerService?: EventBridgeSchedulerService
  ) {
    this.bullMqService = bullMqService;
    if (logger) {
      this.logger.setContext(LOG_CONTEXT);
    }
  }

  public createQueue(overrideOptions?: QueueOptions): void {
    // Building the queue allocates its Redis keys, so skip it once BullMQ is
    // retired. The count getters already return 0 when `queue` is unset.
    if (!isBullMqEnabled()) {
      return;
    }

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

  /**
   * The signal for the `sqs_bullmq` -> `sqs` cutover. A job left in the BullMQ
   * delayed set when the worker goes away is never delivered, and deferral is
   * capped at 180 days, so this must read zero before the flip.
   */
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
    if (!this.routesToSqs()) {
      return await this.addToBullMQ(params);
    }

    return await this.dispatch([params]);
  }

  public async addBulk(data: IBulkJobParams[]) {
    if (!this.routesToSqs()) {
      return await this.bullMqService.addBulk(data);
    }

    return await this.dispatch(data);
  }

  /**
   * Whether this enqueue goes to SQS, given the deployment's backend and
   * whether this particular topic has a queue URL.
   *
   * An unconfigured topic in `sqs` mode is fatal rather than a quiet BullMQ
   * write: nothing consumes BullMQ there, so the job would disappear. Boot
   * validation normally catches this first; this is the backstop for a process
   * enqueuing to a topic its own validator did not know about.
   */
  private routesToSqs(): boolean {
    if (!isSqsPrimary()) {
      return false;
    }

    const isConfigured = this.sqsService?.isConfigured(this.topic) ?? false;

    if (!isConfigured && !isBullMqEnabled()) {
      throw new Error(
        `No SQS queue URL configured for topic "${this.topic}" and BullMQ is disabled ` +
          `(QUEUE_BACKEND=${QueueBackend.SQS}), so the job has no backend to go to`
      );
    }

    return isConfigured;
  }

  private async dispatch(jobs: (IJobParams | IBulkJobParams)[]): Promise<void> {
    const { toBullMq, toScheduler, toSqs } = this.planDispatch(jobs);

    if (toBullMq.length > 0) {
      await this.addJobsToBullMQ(toBullMq);
    }

    try {
      await this.addJobsToSQS(toScheduler, toSqs);
    } catch (error) {
      await this.handleSqsFailure(error, [...toScheduler, ...toSqs]);
    }
  }

  /**
   * Which of the three destinations each job is bound for, decided up front so
   * the fan-out is legible in one place rather than inferred from the order of
   * nested splits.
   *
   * SQS caps a per-message delay at 900s, so a longer delay can only reach the
   * queue through EventBridge Scheduler. Where the scheduler is unavailable
   * BullMQ still holds them - and where BullMQ is gone too, nothing can, which
   * has to be an error rather than a write into a queue that was never created.
   */
  private planDispatch(jobs: (IJobParams | IBulkJobParams)[]): {
    toBullMq: (IJobParams | IBulkJobParams)[];
    toScheduler: (IJobParams | IBulkJobParams)[];
    toSqs: (IJobParams | IBulkJobParams)[];
  } {
    const { longDelayed, sqsEligible } = this.separateByDelay(jobs);

    if (longDelayed.length === 0) {
      return { toBullMq: [], toScheduler: [], toSqs: sqsEligible };
    }

    if (this.schedulerService?.isConfigured(this.topic)) {
      return { toBullMq: [], toScheduler: longDelayed, toSqs: sqsEligible };
    }

    /*
     * Boot validation demands scheduler config for the topics that carry
     * delays, but it cannot prove the config is usable - a queue URL the
     * scheduler cannot derive an ARN from leaves `isConfigured` false on a
     * deployment that passed validation. Failing here makes that a legible
     * error instead of a `TypeError` from an uncreated BullMQ queue.
     */
    if (!isBullMqEnabled()) {
      throw new Error(
        `Cannot enqueue ${longDelayed.length} job(s) on topic "${this.topic}" with a delay beyond the ` +
          `SQS ${SQS_MAX_DELAY_SECONDS}s cap: EventBridge Scheduler is not configured for this topic and ` +
          `BullMQ is disabled (QUEUE_BACKEND=${QueueBackend.SQS})`
      );
    }

    return { toBullMq: longDelayed, toScheduler: [], toSqs: sqsEligible };
  }

  /**
   * What happens to jobs SQS refused.
   *
   * In `sqs_bullmq` BullMQ absorbs them, which is the point of that mode. Once
   * BullMQ is gone there is nothing to absorb them, so the error has to reach
   * the caller - every producer is either a retried job or a request that can
   * surface a failure.
   *
   * Only the undelivered jobs are re-queued when the failure identified them,
   * which is what stops a mid-batch failure from double-delivering everything
   * SQS already accepted.
   */
  private async handleSqsFailure(error: unknown, jobs: (IJobParams | IBulkJobParams)[]): Promise<void> {
    const fallbackJobs = error instanceof PartialDispatchError ? error.unsentJobs : jobs;
    // Reached only when SQS is primary, so "BullMQ is alive" means `sqs_bullmq`.
    const canFallBack = isBullMqEnabled();

    Logger.error(
      {
        topic: this.topic,
        count: jobs.length,
        unsentCount: fallbackJobs.length,
        error: error instanceof Error ? error.message : String(error),
        errorName: resolveErrorNames(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      canFallBack ? 'SQS send failed, falling back to BullMQ' : 'SQS send failed',
      LOG_CONTEXT
    );

    if (canFallBack) {
      if (fallbackJobs.length > 0) {
        await this.addJobsToBullMQ(fallbackJobs);
      }

      return;
    }

    throw error;
  }

  /**
   * The SQS `MessageGroupId`, which decides fair-queue ordering.
   *
   * Organization-scoped topics pass the organization as `groupId`, so one noisy
   * tenant cannot stall another. Topics with no tenant to be fair to override
   * this with a per-message value to keep them fully parallel.
   *
   * Any stable string is acceptable: this value never leaves SQS. The tenant a
   * long delay is scheduled under is resolved separately by `resolveTenantId`.
   */
  protected resolveGroupId(job: IJobParams | IBulkJobParams): string {
    return job.groupId || job.data?._organizationId || resolveScheduleId(job);
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

  /**
   * Delivers the two AWS legs. A schedule is just a deferred send to this same
   * queue, so both live behind one failure boundary.
   */
  private async addJobsToSQS(
    toScheduler: (IJobParams | IBulkJobParams)[],
    sqsEligible: (IJobParams | IBulkJobParams)[]
  ): Promise<void> {
    if (toScheduler.length > 0) {
      try {
        await this.addJobsToScheduler(toScheduler);
      } catch (error) {
        /*
         * Nothing has been sent to SQS yet, so the eligible jobs are unsent too
         * - they are never attempted once this throws.
         */
        const unsentScheduled = error instanceof PartialDispatchError ? error.unsentJobs : toScheduler;
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
      const id = `${this.topic}-${index}`;
      jobsByMessageId.set(id, job);

      return {
        id,
        body: JSON.stringify(job.data || {}),
        groupId: toSqsGroupId(this.resolveGroupId(job)),
        delaySeconds: Math.ceil((job.options?.delay || 0) / 1000),
      };
    });

    try {
      if (messages.length === 1) {
        await this.sqsService.send(this.topic, messages[0]);
      } else {
        await this.sqsService.sendBulk(this.topic, messages);
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
   * Throws when the scheduler is unavailable so the caller's failure handling
   * runs, which is exactly what should happen to a job that has no other way
   * to be delivered.
   */
  private async addJobsToScheduler(jobs: (IJobParams | IBulkJobParams)[]): Promise<void> {
    if (!this.schedulerService) {
      throw new Error(`EventBridge Scheduler is unavailable for long-delayed jobs on topic: ${this.topic}`);
    }

    const now = Date.now();

    /*
     * `async` so a job that cannot resolve a tenant becomes a rejected promise
     * rather than throwing out of `map` and taking the whole batch's
     * partial-dispatch accounting with it.
     */
    const results = await Promise.allSettled(
      jobs.map(async (job) =>
        this.schedulerService.createDelayedFire(this.topic, {
          deferReason: job.deferReason || DeferReasonEnum.DELAY,
          fireAt: new Date(now + (job.options?.delay || 0)),
          organizationId: resolveTenantId(job),
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
  }

  protected async addToBullMQ(params: IJobParams) {
    const jobOptions = {
      removeOnComplete: true,
      removeOnFail: true,
      ...params.options,
    };

    await this.bullMqService.add(params.name, params.data, jobOptions, params.groupId);
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
