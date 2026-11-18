import { Injectable } from '@nestjs/common';
import {
  MetricsService,
  PinoLogger,
  QueryBuilder,
  STEP_RUNS_V2_MAX_READ_LIMIT,
  StepRunV2ReadRow,
  StepRunV2Repository,
  Trace,
  TraceLogRepository,
} from '@novu/application-generic';
import { NotificationFeedFilters, NotificationFeedItemEntity, NotificationRepository } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { subDays } from 'date-fns';
import {
  groupStepRunsByWorkflowRunId,
  mapStepRunToJob,
  parseDigestEvents,
  StepTraceFetchResult,
} from './notification-feed-v2.mappers';

export const NOTIFICATION_FEED_V2_MISSING_STEPS_METRIC = 'activity.notifications_v2.missing_step_runs';

const TRACE_AFTER_BUFFER_DAYS = 1;
/** The trace repository reads at most this many rows per query. */
const TRACE_READ_LIMIT = 1000;
/** Step runs per execution details query: room for 50 traces per step within one read. */
const EXECUTION_DETAILS_STEPS_PER_QUERY = 20;
/** Digest steps per digest events query: room for 20 `digest_triggered` traces per step within one read. */
const DIGEST_EVENTS_STEPS_PER_QUERY = 50;
/** A feed page holds at most 50 runs; this bounds a read that keeps returning full pages. */
const STEP_RUNS_MAX_PAGES = 20;

const traceSelectColumns = ['entity_id', 'id', 'status', 'title', 'raw_data', 'created_at'] as const;
const digestTraceSelectColumns = ['entity_id', 'raw_data', 'created_at'] as const;
type DigestTraceFetchResult = Pick<Trace, (typeof digestTraceSelectColumns)[number]>;

type ReadScope = { environmentId: string; organizationId: string };

export type GetFeedV2Params = ReadScope & {
  filters: NotificationFeedFilters;
  skip: number;
  limit: number;
};

export type GetFeedItemV2Params = ReadScope & { notificationId: string };

/**
 * Reads the `/v1/notifications` activity feed without the jobs collection: notifications (with their subscriber
 * and workflow) from Mongo, steps with their `job.step` snapshot from ClickHouse `step_runs_v2`, and execution
 * details and digest events from traces. Used when IS_ACTIVITY_STEP_RUNS_V2_READ_ENABLED is on.
 */
@Injectable()
export class NotificationFeedV2Reader {
  constructor(
    private notificationRepository: NotificationRepository,
    private stepRunV2Repository: StepRunV2Repository,
    private traceLogRepository: TraceLogRepository,
    private metricsService: MetricsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async getFeed({ filters, skip, limit, ...scope }: GetFeedV2Params): Promise<NotificationFeedItemEntity[]> {
    const notifications = await this.notificationRepository.getFeedWithoutJobs(
      scope.environmentId,
      filters,
      skip,
      limit
    );

    return this.attachJobs(notifications, scope);
  }

  async getFeedItem({ notificationId, ...scope }: GetFeedItemV2Params): Promise<NotificationFeedItemEntity | null> {
    if (!NotificationRepository.isInternalId(notificationId)) {
      return null;
    }

    const notification = await this.notificationRepository.findNotificationMetadataOnly(
      notificationId,
      scope.environmentId,
      scope.organizationId
    );

    if (!notification) {
      return null;
    }

    const [feedItem] = await this.attachJobs([notification], scope);

    return feedItem;
  }

  private async attachJobs(
    notifications: NotificationFeedItemEntity[],
    scope: ReadScope
  ): Promise<NotificationFeedItemEntity[]> {
    if (notifications.length === 0) {
      return notifications;
    }

    const oldestCreatedAt = this.findOldestCreatedAt(notifications);
    const stepRuns = await this.findStepRuns(scope.environmentId, notifications, oldestCreatedAt);
    this.recordMissingStepRuns(notifications, stepRuns);

    // The jobs populate never returned trigger jobs.
    const visibleStepRuns = stepRuns.filter((row) => row.step_type !== StepTypeEnum.TRIGGER);
    const digestStepRunIds = visibleStepRuns
      .filter((row) => row.step_type === StepTypeEnum.DIGEST)
      .map((row) => row.step_run_id);
    const [tracesByStepRunId, digestEventsByStepRunId] = await Promise.all([
      this.findExecutionDetails(
        scope,
        visibleStepRuns.map((row) => row.step_run_id),
        oldestCreatedAt
      ),
      this.findDigestEvents(scope, digestStepRunIds, oldestCreatedAt),
    ]);

    const stepRunsByNotificationId = groupStepRunsByWorkflowRunId(visibleStepRuns);

    return notifications.map((notification) => ({
      ...notification,
      jobs: (stepRunsByNotificationId.get(notification._id) ?? []).map((row) =>
        mapStepRunToJob(row, { tracesByStepRunId, digestEventsByStepRunId })
      ),
    }));
  }

  private findOldestCreatedAt(notifications: NotificationFeedItemEntity[]): Date {
    return notifications.reduce<Date>((oldest, notification) => {
      const createdAt = notification.createdAt ? new Date(notification.createdAt) : oldest;

      return createdAt < oldest ? createdAt : oldest;
    }, new Date());
  }

  /**
   * Pages through every step row of the runs: a full feed page can hold more rows than one read returns.
   * Rows are keyed by step run so a step inserted between pages is not returned twice.
   */
  private async findStepRuns(
    environmentId: string,
    notifications: NotificationFeedItemEntity[],
    oldestRunCreatedAt: Date
  ): Promise<StepRunV2ReadRow[]> {
    const workflowRunIds = notifications.map((notification) => notification._id);
    const rowsByStepRunId = new Map<string, StepRunV2ReadRow>();

    try {
      for (let page = 0; page < STEP_RUNS_MAX_PAGES; page += 1) {
        const rows = await this.stepRunV2Repository.findByWorkflowRunIds({
          environmentId,
          workflowRunIds,
          oldestRunCreatedAt,
          limit: STEP_RUNS_V2_MAX_READ_LIMIT,
          offset: page * STEP_RUNS_V2_MAX_READ_LIMIT,
        });
        for (const row of rows) {
          rowsByStepRunId.set(row.step_run_id, row);
        }

        if (rows.length < STEP_RUNS_V2_MAX_READ_LIMIT) {
          return Array.from(rowsByStepRunId.values());
        }
      }

      this.logger.warn({ workflowRunIds }, 'step_runs_v2 rows for notifications exceed the read page cap');

      return Array.from(rowsByStepRunId.values());
    } catch (error) {
      this.logger.warn({ err: error, workflowRunIds }, 'Failed to get step_runs_v2 rows for notifications');

      return [];
    }
  }

  /** Splits the step runs so that each trace read stays within the repository's row limit. */
  private async findTracesInBatches<T>(
    stepRunIds: string[],
    stepsPerQuery: number,
    read: (batch: string[]) => Promise<T[]>
  ): Promise<T[]> {
    const batches: string[][] = [];
    for (let index = 0; index < stepRunIds.length; index += stepsPerQuery) {
      batches.push(stepRunIds.slice(index, index + stepsPerQuery));
    }

    return (await Promise.all(batches.map(read))).flat();
  }

  private async findExecutionDetails(
    scope: ReadScope,
    stepRunIds: string[],
    oldestCreatedAt: Date
  ): Promise<Map<string, StepTraceFetchResult[]>> {
    if (stepRunIds.length === 0) {
      return new Map();
    }

    try {
      const traces = await this.findTracesInBatches(stepRunIds, EXECUTION_DETAILS_STEPS_PER_QUERY, async (batch) => {
        const result = await this.traceLogRepository.find({
          where: this.buildStepTraceQuery(scope, batch, oldestCreatedAt).build(),
          orderBy: 'created_at',
          orderDirection: 'ASC',
          limit: TRACE_READ_LIMIT,
          select: traceSelectColumns,
        });

        return result.data;
      });

      const tracesByStepRunId = new Map<string, StepTraceFetchResult[]>();
      for (const trace of traces) {
        const traces = tracesByStepRunId.get(trace.entity_id) ?? [];
        traces.push(trace);
        tracesByStepRunId.set(trace.entity_id, traces);
      }

      return tracesByStepRunId;
    } catch (error) {
      this.logger.warn({ err: error, stepRunIds }, 'Failed to get execution details from traces');

      return new Map();
    }
  }

  private async findDigestEvents(
    scope: ReadScope,
    digestStepRunIds: string[],
    oldestCreatedAt: Date
  ): Promise<Map<string, Record<string, unknown>[]>> {
    if (digestStepRunIds.length === 0) {
      return new Map();
    }

    try {
      const traces = await this.findTracesInBatches(digestStepRunIds, DIGEST_EVENTS_STEPS_PER_QUERY, async (batch) => {
        const query = this.buildStepTraceQuery(scope, batch, oldestCreatedAt)
          .whereEquals('event_type', 'digest_triggered')
          .whereEquals('status', 'success');
        const result = await this.traceLogRepository.find({
          where: query.build(),
          orderBy: 'created_at',
          orderDirection: 'DESC',
          limit: TRACE_READ_LIMIT,
          select: digestTraceSelectColumns,
        });

        return result.data as DigestTraceFetchResult[];
      });

      // Newest first: the latest `digest_triggered` trace of each step wins.
      const eventsByStepRunId = new Map<string, Record<string, unknown>[]>();
      for (const trace of traces) {
        if (eventsByStepRunId.has(trace.entity_id)) {
          continue;
        }

        const events = parseDigestEvents(trace.raw_data);
        if (events) {
          eventsByStepRunId.set(trace.entity_id, events);
        }
      }

      return eventsByStepRunId;
    } catch (error) {
      this.logger.warn({ err: error, digestStepRunIds }, 'Failed to get digest events from traces');

      return new Map();
    }
  }

  /**
   * Traces can arrive long after the run that produced them, but never before it, so the oldest run's
   * creation time bounds the scan and lets ClickHouse prune partitions.
   */
  private buildStepTraceQuery(scope: ReadScope, stepRunIds: string[], oldestCreatedAt: Date): QueryBuilder<Trace> {
    return new QueryBuilder<Trace>({ environmentId: scope.environmentId })
      .whereIn('entity_id', stepRunIds)
      .whereEquals('entity_type', 'step_run')
      .whereEquals('organization_id', scope.organizationId)
      .whereGreaterThanOrEqual('created_at', subDays(oldestCreatedAt, TRACE_AFTER_BUFFER_DAYS));
  }

  private recordMissingStepRuns(notifications: NotificationFeedItemEntity[], stepRuns: StepRunV2ReadRow[]): void {
    const notificationIdsWithSteps = new Set(stepRuns.map((row) => row.workflow_run_id));
    const missingCount = notifications.filter((notification) => !notificationIdsWithSteps.has(notification._id)).length;

    if (missingCount > 0) {
      this.metricsService.recordMetric(NOTIFICATION_FEED_V2_MISSING_STEPS_METRIC, missingCount);
    }
  }
}
