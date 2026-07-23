import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  FeatureFlagsService,
  PinoLogger,
  QueryBuilder,
  Trace,
  TraceLogRepository,
} from '@novu/application-generic';
import { ExecutionDetailFeedItem, NotificationFeedItemEntity, NotificationRepository } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { subDays } from 'date-fns';

import { ActivityNotificationResponseDto } from '../../dtos/activities-response.dto';
import { mapFeedItemToDto } from '../get-activity-feed/map-feed-item-to.dto';
import { GetActivityCommand } from './get-activity.command';

const TRACE_AFTER_BUFFER_DAYS = 1;

const traceSelectColumns = ['id', 'entity_id', 'title', 'status', 'created_at', 'raw_data'] as const;

@Injectable()
export class GetActivity {
  constructor(
    private notificationRepository: NotificationRepository,
    private analyticsService: AnalyticsService,
    private traceLogRepository: TraceLogRepository,
    private logger: PinoLogger,
    private featureFlagsService: FeatureFlagsService
  ) {
    this.logger.setContext(this.constructor.name);
  }

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

    this.logger.debug({ tracesEnabled }, 'feature flags');

    let feedItem: NotificationFeedItemEntity | null = null;

    if (tracesEnabled) {
      this.logger.debug('analytics traces enabled');
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
    command: GetActivityCommand,
    /**
     * Lower bound for the trace `created_at` scan. Should be the parent notification's
     * creation time — traces (e.g. message_seen, delivery callbacks) can arrive long
     * after, but never before, the workflow run that produced them. Passing this lets
     * ClickHouse prune partitions and skip granules on the `toDate(created_at)` sort key.
     */
    notificationCreatedAt?: Date
  ): Promise<Map<string, ExecutionDetailFeedItem[]>> {
    if (entityIds.length === 0) {
      return new Map();
    }

    const traceQueryBuilder = new QueryBuilder<Trace>({
      environmentId: command.environmentId,
    })
      .whereIn('entity_id', entityIds)
      .whereEquals('entity_type', 'step_run')
      .whereEquals('organization_id', command.organizationId);

    if (notificationCreatedAt) {
      traceQueryBuilder.whereGreaterThanOrEqual('created_at', subDays(notificationCreatedAt, TRACE_AFTER_BUFFER_DAYS));
    }

    const traceResult = await this.traceLogRepository.find({
      where: traceQueryBuilder.build(),
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

      const executionDetailsByJobId = await this.getExecutionDetailsByEntityId(
        jobIds,
        command,
        feedItem.createdAt ? new Date(feedItem.createdAt) : undefined
      );

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
