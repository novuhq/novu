import { Injectable } from '@nestjs/common';
import {
  FeatureFlagsService,
  Instrument,
  PinoLogger,
  QueryBuilder,
  Trace,
  TraceLogRepository,
} from '@novu/application-generic';
import {
  ExecutionDetailFeedItem,
  NotificationFeedItemEntity,
  NotificationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { subDays } from 'date-fns';
import { ActivityRetentionService } from '../../../shared/services/activity-retention.service';
import { ActivitiesResponseDto, ActivityNotificationResponseDto } from '../../dtos/activities-response.dto';
import { GetActivityFeedCommand } from './get-activity-feed.command';
import { mapFeedItemToDto } from './map-feed-item-to.dto';

const TRACE_AFTER_BUFFER_DAYS = 1;
const EXECUTION_DETAILS_TRACE_LIMIT = 200;
const traceFindColumns = ['entity_id', 'id', 'status', 'title', 'raw_data', 'created_at'] as const;
type TraceFindResult = Pick<Trace, (typeof traceFindColumns)[number]>;

@Injectable()
export class GetActivityFeed {
  constructor(
    private subscribersRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    private activityRetentionService: ActivityRetentionService,
    private traceLogRepository: TraceLogRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: GetActivityFeedCommand): Promise<ActivitiesResponseDto> {
    let subscriberIds: string[] | undefined;

    const retentionRange = await this.activityRetentionService.resolve({
      organizationId: command.organizationId,
      after: command.after,
      before: command.before,
    });
    const validatedCommand = { ...command, ...retentionRange };

    if (command.search || command.emails?.length || command.subscriberIds?.length) {
      subscriberIds = await this.findSubscribers(command);
    }

    if (subscriberIds && subscriberIds.length === 0) {
      return {
        page: 0,
        hasMore: false,
        pageSize: command.limit,
        data: [],
      };
    }

    const notifications: NotificationFeedItemEntity[] = await this.getFeedNotifications(
      validatedCommand,
      subscriberIds
    );

    const data = notifications.reduce<ActivityNotificationResponseDto[]>((memo, notification) => {
      // TODO: Identify why mongo returns an array of undefined or null values. Is it a data issue?
      if (notification) {
        memo.push(mapFeedItemToDto(notification));
      }

      return memo;
    }, []);

    return {
      page: command.page,
      hasMore: notifications?.length === command.limit,
      pageSize: command.limit,
      data,
    };
  }

  @Instrument()
  private async findSubscribers(command: GetActivityFeedCommand): Promise<string[]> {
    return await this.subscribersRepository.searchSubscribers(
      command.environmentId,
      command.subscriberIds,
      command.emails,
      command.search
    );
  }

  @Instrument()
  private async getFeedNotifications(
    command: GetActivityFeedCommand,
    subscriberIds?: string[]
  ): Promise<NotificationFeedItemEntity[]> {
    const notifications = await this.notificationRepository.getFeed(
      command.environmentId,
      {
        channels: command.channels,
        templates: command.templates,
        subscriberIds: subscriberIds || [],
        transactionId: command.transactionId,
        topicKey: command.topicKey,
        subscriptionId: command.subscriptionId,
        after: command.after,
        before: command.before,
        severity: command.severity,
        contextKeys: command.contextKeys,
      },
      command.page * command.limit,
      command.limit
    );

    const isClickHouseOnlyEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_EXECUTION_DETAILS_CLICKHOUSE_ONLY_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
      user: { _id: command.userId },
      environment: { _id: command.environmentId },
    });

    if (isClickHouseOnlyEnabled) {
      return await this.enhanceNotificationsWithTraces(notifications, command);
    }

    return notifications;
  }

  private async enhanceNotificationsWithTraces(
    notifications: NotificationFeedItemEntity[],
    command: GetActivityFeedCommand
  ): Promise<NotificationFeedItemEntity[]> {
    try {
      // Collect all job IDs from all notifications
      const allJobIds: string[] = [];
      for (const notification of notifications) {
        if (notification.jobs) {
          allJobIds.push(...notification.jobs.map((job) => job._id));
        }
      }

      if (allJobIds.length === 0) {
        return notifications;
      }

      // Get execution details from ClickHouse for all job IDs
      const executionDetailsByJobId = await this.getExecutionDetailsByEntityId(allJobIds, command);

      // Enhance each notification with the execution details
      const enhancedNotifications = notifications.map((notification) => {
        if (!notification.jobs) {
          return notification;
        }

        const enhancedJobs = notification.jobs.map((job) => {
          const executionDetails = executionDetailsByJobId.get(job._id) || [];

          return {
            ...job,
            executionDetails,
          };
        });

        return {
          ...notification,
          jobs: enhancedJobs,
        };
      });

      this.logger.debug(
        {
          notificationCount: notifications.length,
          jobCount: allJobIds.length,
          executionDetailsCount: Array.from(executionDetailsByJobId.values()).flat().length,
        },
        'Successfully enhanced notifications with ClickHouse execution details'
      );

      return enhancedNotifications;
    } catch (error) {
      this.logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        },
        'Failed to enhance notifications with ClickHouse execution details, falling back to MongoDB data'
      );

      // Fall back to the original notifications if ClickHouse query fails
      return notifications;
    }
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
    command: GetActivityFeedCommand
  ): Promise<Map<string, ExecutionDetailFeedItem[]>> {
    if (entityIds.length === 0) {
      return new Map();
    }

    // Only bound by `after`, not `before`: traces (e.g. message_seen, delivery callbacks)
    // can arrive long after the workflow run was created, but never before it.
    // Subtract a small buffer to absorb clock skew between the API and trace ingestion.
    const traceQueryBuilder = new QueryBuilder<Trace>({
      environmentId: command.environmentId,
    })
      .whereIn('entity_id', entityIds)
      .whereEquals('entity_type', 'step_run')
      .whereEquals('organization_id', command.organizationId);

    if (command.after) {
      const afterWithBuffer = subDays(new Date(command.after), TRACE_AFTER_BUFFER_DAYS);
      traceQueryBuilder.whereGreaterThanOrEqual('created_at', afterWithBuffer);
    }

    const traceQuery = traceQueryBuilder.build();

    const traceResult = await this.traceLogRepository.find({
      where: traceQuery,
      orderBy: 'created_at',
      orderDirection: 'ASC',
      limit: EXECUTION_DETAILS_TRACE_LIMIT,
      select: traceFindColumns,
    });

    const executionDetailsByEntityId = new Map<string, ExecutionDetailFeedItem[]>();

    // Group traces by entity ID
    const traceLogsByEntityId = new Map<string, TraceFindResult[]>();
    for (const trace of traceResult.data) {
      if (!traceLogsByEntityId.has(trace.entity_id)) {
        traceLogsByEntityId.set(trace.entity_id, []);
      }
      const entityTraces = traceLogsByEntityId.get(trace.entity_id);
      if (entityTraces) {
        entityTraces.push(trace);
      }
    }

    // Convert traces to execution details for each entity
    for (const [entityId, traces] of traceLogsByEntityId) {
      const executionDetails: ExecutionDetailFeedItem[] = traces.map((trace: TraceFindResult) => ({
        _id: trace.id,
        providerId: undefined,
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
}
