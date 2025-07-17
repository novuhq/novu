import { Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationRepository,
  ExecutionDetailFeedItem,
  JobStatusEnum,
  NotificationFeedItemEntity,
  JobFeedItem,
  NotificationStepEntity,
} from '@novu/dal';
import {
  AnalyticsService,
  TraceLogRepository,
  StepRunRepository,
  PinoLogger,
  FeatureFlagsService,
} from '@novu/application-generic';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  FeatureFlagsKeysEnum,
  ProvidersIdEnum,
  StepTypeEnum,
} from '@novu/shared';

import { ActivityNotificationResponseDto } from '../../dtos/activities-response.dto';
import { GetActivityCommand } from './get-activity.command';
import { mapFeedItemToDto } from '../get-activity-feed/map-feed-item-to.dto';

@Injectable()
export class GetActivity {
  constructor(
    private notificationRepository: NotificationRepository,
    private analyticsService: AnalyticsService,
    private traceLogRepository: TraceLogRepository,
    private stepRunRepository: StepRunRepository,
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
      const stepRunsEnabled = await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_STEP_RUN_LOGS_ENABLED,
        defaultValue: false,
        organization: { _id: command.organizationId },
        user: { _id: command.userId },
        environment: { _id: command.environmentId },
      });

      if (stepRunsEnabled) {
        feedItem = await this.getFeedItemFromStepRuns(command);
      } else {
        feedItem = await this.getFeedItemFromTraceLog(command);
      }
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

      const stepRunsResult = await this.stepRunRepository.find({
        where: {
          organization_id: command.organizationId,
          environment_id: command.environmentId,
          // Query by notification's transaction ID to get all related step runs
          transaction_id: feedItem.transactionId,
        },
        limit: 1000,
        /*
         * ClickHouse only supports ordering by organization_id and step_run_id
         * We'll sort by updated_at and created_at after getting the results
         */
      });

      // Deduplicate step runs
      if (stepRunsResult.data && stepRunsResult.data.length > 0) {
        // Sort by updated_at in descending order (newest first)
        stepRunsResult.data.sort((a, b) => {
          const updatedAtA = new Date(a.updated_at).getTime();
          const updatedAtB = new Date(b.updated_at).getTime();

          return updatedAtB - updatedAtA; // Descending order (newest first)
        });

        // Deduplicate by organization_id and step_run_id, keeping the most recent (first occurrence after sorting)
        const seenKeys = new Set<string>();
        stepRunsResult.data = stepRunsResult.data.filter((stepRun) => {
          const dedupeKey = `${stepRun.organization_id}:${stepRun.step_run_id}`;
          if (seenKeys.has(dedupeKey)) {
            return false;
          }
          seenKeys.add(dedupeKey);

          return true;
        });

        stepRunsResult.data.sort((a, b) => {
          const updatedAtA = new Date(a.updated_at).getTime();
          const updatedAtB = new Date(b.updated_at).getTime();

          return updatedAtA - updatedAtB;
        });
      }

      if (!stepRunsResult.data || stepRunsResult.data.length === 0) {
        feedItem.jobs = [];

        return feedItem;
      }

      // Get step run IDs for trace queries
      const stepRunIds = stepRunsResult.data.map((stepRun) => stepRun.step_run_id);

      // Get traces for these step runs
      const traceResult = await this.traceLogRepository.find({
        where: {
          entity_id: { operator: 'IN', value: stepRunIds },
          entity_type: 'step_run',
          environment_id: command.environmentId,
          organization_id: command.organizationId,
        },
        limit: 1000,
        /*
         * Column 'created_at' cannot be used for ordering. Available columns: organization_id, step_run_id
         * orderBy: 'created_at',
         * orderDirection: 'ASC',
         */
      });

      const traceLogsByStepRunId = new Map<string, typeof traceResult.data>();
      for (const trace of traceResult.data) {
        if (!traceLogsByStepRunId.has(trace.entity_id)) {
          traceLogsByStepRunId.set(trace.entity_id, []);
        }
        traceLogsByStepRunId.get(trace.entity_id)!.push(trace);
      }

      // Map step runs to job format
      feedItem.jobs = stepRunsResult.data.map((stepRun) => {
        const traces = traceLogsByStepRunId.get(stepRun.step_run_id) || [];
        const executionDetails: ExecutionDetailFeedItem[] = traces.map((trace) => ({
          _id: trace.id,
          providerId: stepRun.provider_id as ProvidersIdEnum,
          detail: trace.title,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          _jobId: stepRun.step_run_id,
          status: this.mapTraceStatusToExecutionStatus(trace.status),
          isTest: false,
          isRetry: false,
          createdAt: new Date(trace.created_at).toISOString(),
          raw: trace.raw_data,
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
        'Failed to get feed item from step runs'
      );

      // Fall back to the current stage 1 method (traces + jobs from MongoDB)
      return await this.getFeedItemFromTraceLog(command);
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
