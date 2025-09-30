import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  FeatureFlagsService,
  Instrument,
  PinoLogger,
  QueryBuilder,
  Trace,
  TraceLogRepository,
} from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  ExecutionDetailFeedItem,
  NotificationFeedItemEntity,
  NotificationRepository,
  OrganizationEntity,
  SubscriberRepository,
} from '@novu/dal';
import {
  ApiServiceLevelEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
} from '@novu/shared';
import { ActivitiesResponseDto, ActivityNotificationResponseDto } from '../../dtos/activities-response.dto';
import { GetActivityFeedCommand } from './get-activity-feed.command';
import { mapFeedItemToDto } from './map-feed-item-to.dto';

const traceFindColumns = ['entity_id', 'id', 'status', 'title', 'raw_data', 'created_at'] as const;
type TraceFindResult = Pick<Trace, (typeof traceFindColumns)[number]>;

@Injectable()
export class GetActivityFeed {
  constructor(
    private subscribersRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    private organizationRepository: CommunityOrganizationRepository,
    private traceLogRepository: TraceLogRepository,
    private featureFlagsService: FeatureFlagsService,
    private logger: PinoLogger
  ) {}

  async execute(command: GetActivityFeedCommand): Promise<ActivitiesResponseDto> {
    let subscriberIds: string[] | undefined;

    const { after, before } = await this.validateRetentionLimitForTier(
      command.organizationId,
      command.after,
      command.before
    );

    command.after = after;
    command.before = before;

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

    const notifications: NotificationFeedItemEntity[] = await this.getFeedNotifications(command, subscriberIds);

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

  private async validateRetentionLimitForTier(organizationId: string, after?: string, before?: string) {
    const organization = await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new HttpException('Organization not found', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const maxRetentionMs = this.getMaxRetentionPeriodByOrganization(organization);

    // For unlimited retention (self-hosted), skip retention validation
    if (maxRetentionMs === Number.MAX_SAFE_INTEGER) {
      const effectiveAfterDate = after ? this.parseAndValidateDate(after, 'after') : undefined;
      const effectiveBeforeDate = before ? this.parseAndValidateDate(before, 'before') : undefined;

      // Basic validation for date range if both dates are provided
      if (effectiveAfterDate && effectiveBeforeDate && effectiveAfterDate > effectiveBeforeDate) {
        throw new HttpException(
          'Invalid date range: start date (after) must be earlier than end date (before)',
          HttpStatus.BAD_REQUEST
        );
      }

      return {
        after: effectiveAfterDate?.toISOString(),
        before: effectiveBeforeDate?.toISOString(),
      };
    }

    const earliestAllowedDate = new Date(Date.now() - maxRetentionMs);

    // If no after date is provided, default to the earliest allowed date
    const effectiveAfterDate = after ? this.parseAndValidateDate(after, 'after') : earliestAllowedDate;
    const effectiveBeforeDate = before ? this.parseAndValidateDate(before, 'before') : new Date();

    this.validateDateRange(earliestAllowedDate, effectiveAfterDate, effectiveBeforeDate);

    return {
      after: effectiveAfterDate.toISOString(),
      before: effectiveBeforeDate.toISOString(),
    };
  }

  private parseAndValidateDate(dateString: string, parameterName: string): Date {
    const parsedDate = new Date(dateString);
    
    if (Number.isNaN(parsedDate.getTime())) {
      throw new HttpException(
        `Invalid date format for parameter '${parameterName}': ${dateString}. Please provide a valid ISO 8601 date string.`,
        HttpStatus.BAD_REQUEST
      );
    }
    
    return parsedDate;
  }

  private validateDateRange(earliestAllowedDate: Date, afterDate: Date, beforeDate: Date) {
    if (afterDate > beforeDate) {
      throw new HttpException(
        'Invalid date range: start date (after) must be earlier than end date (before)',
        HttpStatus.BAD_REQUEST
      );
    }

    // add buffer to account for time delay in execution
    const buffer = 1 * 60 * 60 * 1000; // 1 hour
    const bufferedEarliestAllowedDate = new Date(earliestAllowedDate.getTime() - buffer);

    if (afterDate < bufferedEarliestAllowedDate || beforeDate < bufferedEarliestAllowedDate) {
      throw new HttpException(
        `Requested date range exceeds your plan's retention period. ` +
          `The earliest accessible date for your plan is ${earliestAllowedDate.toISOString().split('T')[0]}. ` +
          `Please upgrade your plan to access older activities.`,
        HttpStatus.PAYMENT_REQUIRED
      );
    }
  }

  /**
   * Notifications are automatically deleted after a certain period of time
   * by a background job.
   *
   * @see https://github.com/novuhq/cloud-infra/blob/main/scripts/expiredNotification.js#L93
   */
  private getMaxRetentionPeriodByOrganization(organization: OrganizationEntity) {
    // 1. Self-hosted: effectively unlimited, use a large but safe finite window (100 years)
    if (process.env.IS_SELF_HOSTED === 'true') {
      return 100 * 365 * 24 * 60 * 60 * 1000; // ~100 years in ms, safe for Date math
    }

    const { apiServiceLevel, createdAt } = organization;

    // 2. Special case: Free tier orgs created before Feb 28, 2025 get 30 days
    if (apiServiceLevel === ApiServiceLevelEnum.FREE && new Date(createdAt) < new Date('2025-02-28')) {
      return 30 * 24 * 60 * 60 * 1000;
    }

    // 3. Otherwise, use tier-based retention from feature flags
    return getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
      apiServiceLevel ?? ApiServiceLevelEnum.FREE,
      true
    );
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
        after: command.after,
        before: command.before,
        severity: command.severity,
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

      this.logger.debug('Successfully enhanced notifications with ClickHouse execution details', {
        notificationCount: notifications.length,
        jobCount: allJobIds.length,
        executionDetailsCount: Array.from(executionDetailsByJobId.values()).flat().length,
      });

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
