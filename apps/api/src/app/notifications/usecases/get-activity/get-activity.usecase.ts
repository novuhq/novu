import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  FeatureFlagsService,
  PinoLogger,
  QueryBuilder,
  StepRun,
  StepRunRepository,
  Trace,
  TraceLogRepository,
  WorkflowRun,
  WorkflowRunRepository,
} from '@novu/application-generic';
import {
  ExecutionDetailFeedItem,
  JobFeedItem,
  JobStatusEnum,
  NotificationFeedItemEntity,
  NotificationRepository,
  NotificationStepEntity,
} from '@novu/dal';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  FeatureFlagsKeysEnum,
  ProvidersIdEnum,
  StepTypeEnum,
  TriggerTypeEnum,
} from '@novu/shared';

import { ActivityNotificationResponseDto } from '../../dtos/activities-response.dto';
import { mapFeedItemToDto } from '../get-activity-feed/map-feed-item-to.dto';
import { GetActivityCommand } from './get-activity.command';

const workflowRunSelectColumns = [
  'workflow_run_id',
  'workflow_id',
  'workflow_name',
  'organization_id',
  'environment_id',
  'subscriber_id',
  'external_subscriber_id',
  'trigger_identifier',
  'transaction_id',
  'channels',
  'subscriber_to',
  'payload',
  'topics',
  'created_at',
  'updated_at',
] as const;

const stepRunSelectColumns = [
  'step_run_id',
  'step_id',
  'step_type',
  'provider_id',
  'status',
  'created_at',
  'updated_at',
] as const;
type StepRunFetchResult = Pick<StepRun, (typeof stepRunSelectColumns)[number]>;

const traceSelectColumns = ['id', 'entity_id', 'title', 'status', 'created_at', 'raw_data'] as const;

@Injectable()
export class GetActivity {
  constructor(
    private notificationRepository: NotificationRepository,
    private analyticsService: AnalyticsService,
    private traceLogRepository: TraceLogRepository,
    private stepRunRepository: StepRunRepository,
    private workflowRunRepository: WorkflowRunRepository,
    private logger: PinoLogger,
    private featureFlagsService: FeatureFlagsService
  ) {}

  async execute(command: GetActivityCommand): Promise<ActivityNotificationResponseDto> {
    this.analyticsService.track('Get Activity Feed Item - [Activity Feed]', command.userId, {
      _organization: command.organizationId,
    });

    const tracesEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_TRACE_LOGS_READ_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
      user: { _id: command.userId },
      environment: { _id: command.environmentId },
    });

    const stepRunsEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_STEP_RUN_LOGS_READ_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
      user: { _id: command.userId },
      environment: { _id: command.environmentId },
    });

    const workflowRunsEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_WORKFLOW_RUN_LOGS_READ_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
      user: { _id: command.userId },
      environment: { _id: command.environmentId },
    });

    this.logger.debug('feature flags', {
      tracesEnabled,
      stepRunsEnabled,
      workflowRunsEnabled,
    });

    let feedItem: NotificationFeedItemEntity | null = null;

    if (workflowRunsEnabled && stepRunsEnabled && tracesEnabled) {
      this.logger.debug('analytics full ingegration enabled');
      feedItem = await this.getFeedItemFromWorkflowRuns(command);
    } else if (tracesEnabled && stepRunsEnabled) {
      this.logger.debug('analytics step runs enabled, no workflow runs');
      feedItem = await this.getFeedItemFromStepRuns(command);
    } else if (tracesEnabled) {
      this.logger.debug('analytics traces enabled, no step runs or workflow runs');
      feedItem = await this.getFeedItemFromTraceLog(command);
    } else {
      this.logger.debug('analytics fallback to old method');
      feedItem = await this.notificationRepository.getFeedItem(
        command.notificationId,
        command.environmentId,
        command.organizationId
      );
    }

    if (!feedItem) {
      throw new NotFoundException('Notification not found', {
        cause: `Notification with id ${command.notificationId} not found`,
      });
    }

    return mapFeedItemToDto(feedItem);
  }

  private mapTraceStatusToExecutionStatus(traceStatus: string): ExecutionDetailsStatusEnum {
    switch (traceStatus.toLowerCase()) {
      case 'success':
        return ExecutionDetailsStatusEnum.SUCCESS;
      case 'error':
      case 'failed':
        return ExecutionDetailsStatusEnum.FAILED;
      case 'warning':
        return ExecutionDetailsStatusEnum.WARNING;
      case 'pending':
        return ExecutionDetailsStatusEnum.PENDING;
      case 'queued':
        return ExecutionDetailsStatusEnum.QUEUED;
      default:
        return ExecutionDetailsStatusEnum.PENDING;
    }
  }

  private async getExecutionDetailsByEntityId(
    entityIds: string[],
    command: GetActivityCommand
  ): Promise<Map<string, ExecutionDetailFeedItem[]>> {
    if (entityIds.length === 0) {
      return new Map();
    }

    const traceQuery = new QueryBuilder<Trace>({
      environmentId: command.environmentId,
    })
      .whereIn('entity_id', entityIds)
      .whereEquals('entity_type', 'step_run')
      .build();

    const traceResult = await this.traceLogRepository.find({
      where: traceQuery,
      orderBy: 'created_at',
      orderDirection: 'ASC',
      select: traceSelectColumns,
    });

    const executionDetailsByEntityId = new Map<string, ExecutionDetailFeedItem[]>();

    // Group traces by entity ID
    const traceLogsByEntityId = new Map<string, typeof traceResult.data>();
    for (const trace of traceResult.data) {
      if (!traceLogsByEntityId.has(trace.entity_id)) {
        traceLogsByEntityId.set(trace.entity_id, []);
      }
      // biome-ignore lint/style/noNonNullAssertion: <explanation> we we create it in the if above
      traceLogsByEntityId.get(trace.entity_id)!.push(trace);
    }

    // Convert traces to execution details for each entity
    for (const [entityId, traces] of traceLogsByEntityId) {
      const executionDetails: ExecutionDetailFeedItem[] = traces.map((trace) => ({
        _id: trace.id,
        // TODO: add providerId from traces
        providerId: undefined, // Will be overridden by step runs if available
        detail: trace.title,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        _jobId: entityId,
        status: this.mapTraceStatusToExecutionStatus(trace.status),
        isTest: false,
        isRetry: false,
        createdAt: new Date(trace.created_at).toISOString(),
        raw: trace.raw_data,
      }));

      executionDetailsByEntityId.set(entityId, executionDetails);
    }

    return executionDetailsByEntityId;
  }

  private async processStepRunsForFeedItem(
    feedItem: NotificationFeedItemEntity,
    command: GetActivityCommand
  ): Promise<JobFeedItem[]> {
    const stepRunsQuery = new QueryBuilder<StepRun>({
      environmentId: command.environmentId,
    })
      .whereEquals('transaction_id', feedItem.transactionId)
      .build();

    const stepRunsResult = await this.stepRunRepository.find({
      where: stepRunsQuery,
      orderBy: 'created_at',
      orderDirection: 'ASC',
      useFinal: true,
      select: stepRunSelectColumns,
    });

    if (!stepRunsResult.data || stepRunsResult.data.length === 0) {
      return [];
    }

    const stepRunIds = stepRunsResult.data.map((stepRun) => stepRun.step_run_id);
    const executionDetailsByStepRunId = await this.getExecutionDetailsByEntityId(stepRunIds, command);

    return stepRunsResult.data.map((stepRun) => mapStepRunToJob(stepRun, executionDetailsByStepRunId));
  }

  private async getFeedItemFromStepRuns(command: GetActivityCommand): Promise<NotificationFeedItemEntity | null> {
    try {
      const feedItem = await this.notificationRepository.findNotificationMetadataOnly(
        command.notificationId,
        command.environmentId,
        command.organizationId
      );

      if (!feedItem) {
        return null;
      }

      // Process step runs and add them to the feed item
      feedItem.jobs = await this.processStepRunsForFeedItem(feedItem, command);

      return feedItem;
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          notificationId: command.notificationId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        },
        'Failed to get feed item from step runs'
      );

      // Fall back to the current stage 1 method (traces + jobs from MongoDB)
      return await this.getFeedItemFromTraceLog(command);
    }
  }

  private async getFeedItemFromWorkflowRuns(command: GetActivityCommand): Promise<NotificationFeedItemEntity | null> {
    try {
      const workflowRunQuery = new QueryBuilder<WorkflowRun>({
        environmentId: command.environmentId,
      })
        .whereEquals('workflow_run_id', command.notificationId)
        .build();

      const workflowRunsResult = await this.workflowRunRepository.find({
        where: workflowRunQuery,
        orderBy: 'created_at',
        orderDirection: 'ASC',
        limit: 1,
        useFinal: true,
        select: workflowRunSelectColumns,
      });

      if (!workflowRunsResult.data || workflowRunsResult.data.length === 0) {
        this.logger.warn(
          {
            notificationId: command.notificationId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
          },
          'No workflow run found in ClickHouse, falling back to step runs'
        );

        // Fall back to step runs method
        return await this.getFeedItemFromStepRuns(command);
      }

      const mostRecentWorkflowRun = workflowRunsResult.data[0];

      // Create the base feed item from workflow run data
      const feedItem: NotificationFeedItemEntity = {
        _id: mostRecentWorkflowRun.workflow_run_id,
        _organizationId: mostRecentWorkflowRun.organization_id,
        _environmentId: mostRecentWorkflowRun.environment_id,
        _templateId: mostRecentWorkflowRun.workflow_id,
        _subscriberId: mostRecentWorkflowRun.subscriber_id,
        transactionId: mostRecentWorkflowRun.transaction_id,
        template: {
          _id: mostRecentWorkflowRun.workflow_id,
          name: mostRecentWorkflowRun.workflow_name,
          triggers: [
            {
              identifier: mostRecentWorkflowRun.trigger_identifier,
              type: TriggerTypeEnum.EVENT,
              variables: [],
            },
          ],
        },
        subscriber: {
          _id: mostRecentWorkflowRun.subscriber_id,
          subscriberId: mostRecentWorkflowRun.external_subscriber_id || '',
          firstName: '',
          lastName: '',
          email: '',
          phone: undefined,
        },
        jobs: [],
        to: mostRecentWorkflowRun.subscriber_to ? JSON.parse(mostRecentWorkflowRun.subscriber_to) : {},
        payload: mostRecentWorkflowRun.payload ? JSON.parse(mostRecentWorkflowRun.payload) : {},
        createdAt: new Date(mostRecentWorkflowRun.created_at).toISOString(),
        updatedAt: new Date(mostRecentWorkflowRun.updated_at).toISOString(),
        channels: mostRecentWorkflowRun.channels ? JSON.parse(mostRecentWorkflowRun.channels) : [],
        topics: mostRecentWorkflowRun.topics ? JSON.parse(mostRecentWorkflowRun.topics) : [],
      };

      feedItem.jobs = await this.processStepRunsForFeedItem(feedItem, command);

      return feedItem;
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          notificationId: command.notificationId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        },
        'Failed to get feed item from workflow runs'
      );

      // Fall back to step runs method
      return await this.getFeedItemFromStepRuns(command);
    }
  }

  private async getFeedItemFromTraceLog(command: GetActivityCommand) {
    try {
      const feedItem = await this.notificationRepository.findMetadataForTraces(
        command.notificationId,
        command.environmentId,
        command.organizationId
      );

      if (!feedItem) {
        return null;
      }

      const jobIds = feedItem.jobs.map((job) => job._id);

      if (jobIds.length === 0) {
        return feedItem;
      }

      const executionDetailsByJobId = await this.getExecutionDetailsByEntityId(jobIds, command);

      feedItem.jobs = feedItem.jobs.map((job) => {
        const executionDetails = executionDetailsByJobId.get(job._id) || [];

        return {
          ...job,
          executionDetails,
        };
      });

      return feedItem;
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          notificationId: command.notificationId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        },
        'Failed to get feed item from trace log'
      );

      // Fall back to the old method if trace log query fails
      return await this.notificationRepository.getFeedItem(
        command.notificationId,
        command.environmentId,
        command.organizationId
      );
    }
  }
}

function mapStepRunToJob(
  stepRun: StepRunFetchResult,
  executionDetailsByStepRunId: Map<string, ExecutionDetailFeedItem[]>
): JobFeedItem {
  const baseExecutionDetails = executionDetailsByStepRunId.get(stepRun.step_run_id) || [];
  // Create execution details with provider ID from step run data
  const executionDetails: ExecutionDetailFeedItem[] = baseExecutionDetails.map((detail) => ({
    ...detail,
    providerId: stepRun.provider_id as ProvidersIdEnum,
  }));

  const stepRunDto: NotificationStepEntity = {
    _id: stepRun.step_id,
    _templateId: stepRun.step_id,
    active: true,
    filters: [],
  };

  const jobDto: JobFeedItem = {
    _id: stepRun.step_run_id,
    status: stepRun.status as JobStatusEnum,
    overrides: {}, // Step runs don't have overrides, use empty object
    payload: {}, // Step runs don't have payload, use empty object
    step: stepRunDto,
    type: stepRun.step_type as StepTypeEnum,
    providerId: stepRun.provider_id as ProvidersIdEnum,
    createdAt: new Date(stepRun.created_at).toISOString(),
    updatedAt: new Date(stepRun.updated_at).toISOString(),
    digest: undefined, // Step runs don't have digest info
    executionDetails,
  };

  return jobDto;
}
