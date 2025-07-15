import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationRepository, ExecutionDetailFeedItem } from '@novu/dal';
import { AnalyticsService, TraceLogRepository, PinoLogger, FeatureFlagsService } from '@novu/application-generic';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, FeatureFlagsKeysEnum } from '@novu/shared';

import { ActivityNotificationResponseDto } from '../../dtos/activities-response.dto';
import { GetActivityCommand } from './get-activity.command';
import { mapFeedItemToDto } from '../get-activity-feed/map-feed-item-to.dto';

@Injectable()
export class GetActivity {
  constructor(
    private notificationRepository: NotificationRepository,
    private analyticsService: AnalyticsService,
    private traceLogRepository: TraceLogRepository,
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

    let feedItem;

    if (tracesEnabled) {
      feedItem = await this.getFeedItemFromTraceLog(command);
    } else {
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

      const traceResult = await this.traceLogRepository.find({
        where: {
          entity_id: { operator: 'IN', value: jobIds },
          entity_type: 'step_run',
          environment_id: command.environmentId,
          organization_id: command.organizationId,
        },
        limit: 1000,
        orderBy: 'created_at',
        orderDirection: 'ASC',
      });

      const traceLogsByJobId = new Map<string, typeof traceResult.data>();
      for (const trace of traceResult.data) {
        if (!traceLogsByJobId.has(trace.entity_id)) {
          traceLogsByJobId.set(trace.entity_id, []);
        }
        traceLogsByJobId.get(trace.entity_id)!.push(trace);
      }

      feedItem.jobs = feedItem.jobs.map((job) => {
        const traces = traceLogsByJobId.get(job._id) || [];
        const executionDetails: ExecutionDetailFeedItem[] = traces.map((trace) => ({
          _id: trace.id,
          providerId: undefined,
          detail: trace.title,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          _jobId: job._id,
          status: this.mapTraceStatusToExecutionStatus(trace.status),
          isTest: false,
          isRetry: false,
          createdAt: new Date(trace.created_at).toISOString(),
          raw: trace.raw_data,
        }));

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
