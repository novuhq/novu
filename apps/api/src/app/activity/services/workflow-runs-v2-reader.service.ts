import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import {
  MetricsService,
  PinoLogger,
  QueryBuilder,
  StepRunV2ReadRow,
  StepRunV2Repository,
  Trace,
  TraceLogRepository,
} from '@novu/application-generic';
import {
  NotificationEntity,
  NotificationRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  NotificationWorkflowRunItem,
  SubscriberEntity,
  SubscriberRepository,
  WorkflowRunsPageFilters,
} from '@novu/dal';
import { ChannelTypeEnum, SeverityLevelEnum, StepTypeEnum } from '@novu/shared';
import { subDays } from 'date-fns';
import { ActivityRetentionService } from '../../shared/services/activity-retention.service';
import { GetWorkflowRunResponseBaseDto } from '../dtos/shared.dto';
import { GetWorkflowRunResponseDto, StepRunDto } from '../dtos/workflow-run-response.dto';
import { GetWorkflowRunsResponseDto, WorkflowRunStepsDetailsDto } from '../dtos/workflow-runs-response.dto';
import { mapTraceToExecutionDetailDto } from '../shared/mappers';
import { GetWorkflowRunCommand } from '../usecases/get-workflow-run/get-workflow-run.command';
import { GetWorkflowRunsCommand } from '../usecases/get-workflow-runs/get-workflow-runs.command';
import {
  buildStepDigest,
  decodeWorkflowRunsCursor,
  encodeWorkflowRunsCursor,
  FIRST_PAGE_CURSOR_ID,
  groupStepRunsByWorkflowRunId,
  isFirstPageCursor,
  mapDeliveryEventToStatus,
  mapStatusFilters,
  mapWorkflowStatusEventToDto,
  parseClickHouseDateTime,
  parseDigestEvents,
  sortStepRuns,
  WorkflowRunsCursor,
} from './workflow-runs-v2.mappers';

export const WORKFLOW_RUNS_V2_MISSING_STEPS_METRIC = 'activity.workflow_runs_v2.missing_step_runs';

const STEP_RUNS_READ_LIMIT = 1000;
const TRACE_AFTER_BUFFER_DAYS = 1;
const EXECUTION_DETAILS_TRACE_LIMIT = 200;
const DIGEST_TRIGGERED_TRACE_LIMIT = 50;

const traceSelectColumns = ['entity_id', 'id', 'status', 'title', 'raw_data', 'created_at', 'event_type'] as const;
type TraceFetchResult = Pick<Trace, (typeof traceSelectColumns)[number]>;

const digestTraceSelectColumns = ['entity_id', 'raw_data', 'created_at'] as const;
type DigestTraceFetchResult = Pick<Trace, (typeof digestTraceSelectColumns)[number]>;

type NotificationWorkflowRunDetail = NotificationWorkflowRunItem & Pick<NotificationEntity, 'payload' | 'overrides'>;

const DETAIL_PROJECTION =
  '_id _templateId _environmentId _organizationId _subscriberId transactionId to topics channels severity critical ' +
  'contextKeys lastEmittedDeliveryEvent lastEmittedWorkflowStatusEvent _digestedNotificationId createdAt updatedAt ' +
  'payload overrides';

type TemplateLookup = Pick<NotificationTemplateEntity, '_id' | 'name' | 'triggers'>;
type SubscriberLookup = Pick<SubscriberEntity, '_id' | 'subscriberId'>;

/**
 * Reads the v2 activity workflow runs from Mongo notifications, ClickHouse step_runs_v2 and traces.
 * Used when IS_ACTIVITY_STEP_RUNS_V2_READ_ENABLED is on; it never reads jobs, step_runs or workflow_runs.
 */
@Injectable()
export class WorkflowRunsV2Reader {
  constructor(
    private notificationRepository: NotificationRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private subscriberRepository: SubscriberRepository,
    private stepRunV2Repository: StepRunV2Repository,
    private traceLogRepository: TraceLogRepository,
    private activityRetentionService: ActivityRetentionService,
    private logger: PinoLogger,
    @Optional() private metricsService?: MetricsService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async list(command: GetWorkflowRunsCommand): Promise<GetWorkflowRunsResponseDto> {
    const retentionRange = await this.activityRetentionService.resolve({
      organizationId: command.organizationId,
      after: command.createdGte,
      before: command.createdLte,
    });
    const filters = await this.buildFilters(command, retentionRange);

    if (!filters) {
      return { data: [], next: null, previous: null };
    }

    const cursor = command.cursor ? decodeWorkflowRunsCursor(command.cursor) : undefined;
    const pageCursor = cursor && !isFirstPageCursor(cursor) ? cursor : undefined;

    const runs = await this.notificationRepository.findWorkflowRunsPage({
      environmentId: command.environmentId,
      filters,
      cursor: pageCursor && { createdAt: pageCursor.created_at, id: pageCursor.workflow_run_id },
      limit: command.limit + 1,
      direction: 'DESC',
    });

    const hasMore = runs.length > command.limit;
    if (hasMore) {
      runs.pop();
    }

    const lastRun = runs[runs.length - 1];
    const next = hasMore && lastRun ? encodeWorkflowRunsCursor(this.toCursor(lastRun)) : null;
    const previous =
      pageCursor && runs.length > 0 ? await this.buildPreviousCursor(command, filters, pageCursor) : null;

    const [templates, subscribers, stepRuns] = await Promise.all([
      this.findTemplates(command.environmentId, runs),
      this.findSubscribers(command.environmentId, runs),
      this.findStepRuns(command.environmentId, runs),
    ]);
    const stepRunsByWorkflowRunId = groupStepRunsByWorkflowRunId(stepRuns);
    this.recordMissingStepRuns(runs, stepRunsByWorkflowRunId);

    return {
      data: runs.map((run) => ({
        ...this.mapRun(run, templates, subscribers),
        steps: (stepRunsByWorkflowRunId.get(run._id) ?? []).map(
          (row): WorkflowRunStepsDetailsDto => ({
            id: row.step_run_id,
            stepRunId: row.step_run_id,
            stepId: row.step_id,
            stepType: row.step_type,
            providerId: row.provider_id || undefined,
            status: row.status,
          })
        ),
      })),
      next,
      previous,
    };
  }

  async get(command: GetWorkflowRunCommand): Promise<GetWorkflowRunResponseDto> {
    const notification: NotificationWorkflowRunDetail | null = NotificationRepository.isInternalId(
      command.workflowRunId
    )
      ? await this.notificationRepository.findOne(
          { _id: command.workflowRunId, _environmentId: command.environmentId },
          DETAIL_PROJECTION
        )
      : null;

    if (!notification) {
      throw new NotFoundException('Workflow run not found', {
        cause: `Workflow run with id ${command.workflowRunId} not found`,
      });
    }

    const runs = [notification];
    const [templates, subscribers, stepRuns] = await Promise.all([
      this.findTemplates(command.environmentId, runs),
      this.findSubscribers(command.environmentId, runs),
      this.findStepRuns(command.environmentId, runs),
    ]);

    if (stepRuns.length === 0) {
      this.metricsService?.recordMetric(WORKFLOW_RUNS_V2_MISSING_STEPS_METRIC, 1);
    }

    const runCreatedAt = notification.createdAt ? new Date(notification.createdAt) : undefined;
    const sortedStepRuns = sortStepRuns(stepRuns);
    const digestStepRunIds = sortedStepRuns
      .filter((row) => row.step_type === StepTypeEnum.DIGEST)
      .map((row) => row.step_run_id);
    const [executionDetails, digestEvents] = await Promise.all([
      this.findExecutionDetails(
        command,
        sortedStepRuns.map((row) => row.step_run_id),
        runCreatedAt
      ),
      this.findDigestEvents(command, digestStepRunIds, runCreatedAt),
    ]);

    return {
      ...this.mapRun(notification, templates, subscribers),
      payload: notification.payload ?? {},
      overrides: notification.overrides ?? {},
      steps: sortedStepRuns.map(
        (row): StepRunDto => ({
          stepRunId: row.step_run_id,
          stepId: row.step_id,
          stepType: row.step_type,
          providerId: row.provider_id || undefined,
          status: row.status,
          createdAt: parseClickHouseDateTime(row.created_at),
          updatedAt: parseClickHouseDateTime(row.updated_at),
          digest: buildStepDigest(row, digestEvents.get(row.step_run_id)),
          executionDetails: mapTraceToExecutionDetailDto(executionDetails.get(row.step_run_id) ?? []),
          scheduleExtensionsCount: Number(row.schedule_extensions_count),
        })
      ),
    };
  }

  private async buildFilters(
    command: GetWorkflowRunsCommand,
    retentionRange: { after?: string; before?: string }
  ): Promise<WorkflowRunsPageFilters | null> {
    let templates: string[] | undefined;
    if (command.workflowIds?.length) {
      templates = command.workflowIds.filter((id) => NotificationRepository.isInternalId(id));

      if (templates.length === 0) {
        return null;
      }
    }

    let subscriberIds: string[] | undefined;
    if (command.subscriberIds?.length) {
      subscriberIds = await this.subscriberRepository.searchSubscribers(command.environmentId, command.subscriberIds);

      if (subscriberIds.length === 0) {
        return null;
      }
    }

    return {
      templates,
      subscriberIds,
      transactionId: command.transactionIds,
      channels: command.channels as ChannelTypeEnum[] | undefined,
      topicKey: command.topicKey,
      subscriptionId: command.subscriptionId,
      severity: command.severity as SeverityLevelEnum[] | undefined,
      contextKeys: command.contextKeys,
      after: retentionRange.after,
      before: retentionRange.before,
      statuses: mapStatusFilters(command.statuses),
    };
  }

  /**
   * Same approach as the ClickHouse reader: the runs just newer than the current cursor form the
   * previous page, and the newest of them is the cursor that returns that page in DESC order.
   */
  private async buildPreviousCursor(
    command: GetWorkflowRunsCommand,
    filters: WorkflowRunsPageFilters,
    currentCursor: WorkflowRunsCursor
  ): Promise<string | null> {
    try {
      const newerRuns = await this.notificationRepository.findWorkflowRunsPage({
        environmentId: command.environmentId,
        filters,
        cursor: { createdAt: currentCursor.created_at, id: currentCursor.workflow_run_id },
        limit: command.limit,
        direction: 'ASC',
      });

      if (newerRuns.length === 0) {
        return null;
      }

      if (newerRuns.length < command.limit) {
        return encodeWorkflowRunsCursor({
          created_at: new Date(0).toISOString(),
          workflow_run_id: FIRST_PAGE_CURSOR_ID,
        });
      }

      return encodeWorkflowRunsCursor(this.toCursor(newerRuns[newerRuns.length - 1]));
    } catch (error) {
      this.logger.error({ err: error, currentCursor }, 'Failed to generate previous cursor');

      return null;
    }
  }

  private toCursor(run: NotificationWorkflowRunItem): WorkflowRunsCursor {
    return {
      created_at: new Date(run.createdAt as string).toISOString(),
      workflow_run_id: run._id,
    };
  }

  private async findTemplates(
    environmentId: string,
    runs: NotificationWorkflowRunItem[]
  ): Promise<Map<string, TemplateLookup>> {
    const templateIds = Array.from(new Set(runs.map((run) => run._templateId).filter(Boolean)));

    if (templateIds.length === 0) {
      return new Map();
    }

    const templates: TemplateLookup[] = await this.notificationTemplateRepository.find(
      { _environmentId: environmentId, _id: { $in: templateIds } },
      '_id name triggers',
      { readPreference: 'secondaryPreferred' }
    );

    return new Map(templates.map((template) => [template._id, template]));
  }

  private async findSubscribers(
    environmentId: string,
    runs: NotificationWorkflowRunItem[]
  ): Promise<Map<string, string>> {
    const subscriberIds = Array.from(new Set(runs.map((run) => run._subscriberId).filter(Boolean)));

    if (subscriberIds.length === 0) {
      return new Map();
    }

    const subscribers: SubscriberLookup[] = await this.subscriberRepository.find(
      { _environmentId: environmentId, _id: { $in: subscriberIds } },
      '_id subscriberId',
      { readPreference: 'secondaryPreferred' }
    );

    return new Map(subscribers.map((subscriber) => [subscriber._id, subscriber.subscriberId]));
  }

  private async findStepRuns(environmentId: string, runs: NotificationWorkflowRunItem[]): Promise<StepRunV2ReadRow[]> {
    if (runs.length === 0) {
      return [];
    }

    const oldestRunCreatedAt = runs.reduce<Date>((oldest, run) => {
      const createdAt = new Date(run.createdAt as string);

      return createdAt < oldest ? createdAt : oldest;
    }, new Date());

    try {
      return await this.stepRunV2Repository.findByWorkflowRunIds({
        environmentId,
        workflowRunIds: runs.map((run) => run._id),
        oldestRunCreatedAt,
        limit: STEP_RUNS_READ_LIMIT,
      });
    } catch (error) {
      this.logger.warn(
        { err: error, workflowRunIds: runs.map((run) => run._id) },
        'Failed to get step_runs_v2 rows for workflow runs'
      );

      return [];
    }
  }

  private async findExecutionDetails(
    command: GetWorkflowRunCommand,
    stepRunIds: string[],
    runCreatedAt?: Date
  ): Promise<Map<string, TraceFetchResult[]>> {
    if (stepRunIds.length === 0) {
      return new Map();
    }

    try {
      const query = this.buildStepTraceQuery(command, stepRunIds, runCreatedAt);
      const result = await this.traceLogRepository.find({
        where: query.build(),
        orderBy: 'created_at',
        orderDirection: 'ASC',
        limit: EXECUTION_DETAILS_TRACE_LIMIT,
        select: traceSelectColumns,
      });

      const tracesByStepRunId = new Map<string, TraceFetchResult[]>();
      for (const trace of result.data) {
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
    command: GetWorkflowRunCommand,
    digestStepRunIds: string[],
    runCreatedAt?: Date
  ): Promise<Map<string, Record<string, unknown>[]>> {
    if (digestStepRunIds.length === 0) {
      return new Map();
    }

    try {
      const query = this.buildStepTraceQuery(command, digestStepRunIds, runCreatedAt)
        .whereEquals('event_type', 'digest_triggered')
        .whereEquals('status', 'success');
      const result = await this.traceLogRepository.find({
        where: query.build(),
        orderBy: 'created_at',
        orderDirection: 'DESC',
        limit: DIGEST_TRIGGERED_TRACE_LIMIT,
        select: digestTraceSelectColumns,
      });

      const eventsByStepRunId = new Map<string, Record<string, unknown>[]>();
      for (const trace of result.data as DigestTraceFetchResult[]) {
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
   * Traces can arrive long after the run that produced them, but never before it, so the run's
   * creation time bounds the scan and lets ClickHouse prune partitions.
   */
  private buildStepTraceQuery(
    command: GetWorkflowRunCommand,
    stepRunIds: string[],
    runCreatedAt?: Date
  ): QueryBuilder<Trace> {
    const query = new QueryBuilder<Trace>({ environmentId: command.environmentId })
      .whereIn('entity_id', stepRunIds)
      .whereEquals('entity_type', 'step_run')
      .whereEquals('organization_id', command.organizationId);

    if (runCreatedAt) {
      query.whereGreaterThanOrEqual('created_at', subDays(runCreatedAt, TRACE_AFTER_BUFFER_DAYS));
    }

    return query;
  }

  private recordMissingStepRuns(
    runs: NotificationWorkflowRunItem[],
    stepRunsByWorkflowRunId: Map<string, StepRunV2ReadRow[]>
  ): void {
    const missingCount = runs.filter((run) => !stepRunsByWorkflowRunId.has(run._id)).length;

    if (missingCount > 0) {
      this.metricsService?.recordMetric(WORKFLOW_RUNS_V2_MISSING_STEPS_METRIC, missingCount);
    }
  }

  private mapRun(
    run: NotificationWorkflowRunItem,
    templates: Map<string, TemplateLookup>,
    subscribers: Map<string, string>
  ): GetWorkflowRunResponseBaseDto {
    const template = templates.get(run._templateId);
    const externalSubscriberId = subscribers.get(run._subscriberId) ?? run.to?.subscriberId;

    return {
      id: run._id,
      workflowId: run._templateId,
      workflowName: template?.name ?? '',
      organizationId: run._organizationId,
      environmentId: run._environmentId,
      internalSubscriberId: run._subscriberId,
      subscriberId: externalSubscriberId || undefined,
      status: mapWorkflowStatusEventToDto(run.lastEmittedWorkflowStatusEvent),
      deliveryLifecycleStatus: mapDeliveryEventToStatus(run.lastEmittedDeliveryEvent),
      triggerIdentifier: template?.triggers?.[0]?.identifier ?? '',
      transactionId: run.transactionId,
      createdAt: new Date(run.createdAt as string).toISOString(),
      updatedAt: new Date((run.updatedAt ?? run.createdAt) as string).toISOString(),
      severity: run.severity ?? SeverityLevelEnum.NONE,
      critical: run.critical ?? false,
      contextKeys: run.contextKeys ?? [],
      topics: (run.topics ?? []).map((topic) => ({ _topicId: topic._topicId, topicKey: topic.topicKey })),
      digestedWorkflowRunId: run._digestedNotificationId || undefined,
    };
  }
}
