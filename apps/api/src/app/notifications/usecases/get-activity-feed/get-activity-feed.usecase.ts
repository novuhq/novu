import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Instrument } from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  NotificationFeedItemEntity,
  NotificationRepository,
  OrganizationEntity,
  SubscriberRepository,
} from '@novu/dal';
import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsNumber } from '@novu/shared';
import { ActivitiesResponseDto, ActivityNotificationResponseDto } from '../../dtos/activities-response.dto';
import { GetActivityFeedCommand } from './get-activity-feed.command';
import { mapFeedItemToDto } from './map-feed-item-to.dto';

@Injectable()
export class GetActivityFeed {
  constructor(
    private subscribersRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    private organizationRepository: CommunityOrganizationRepository
  ) {}

  /* eslint-disable no-param-reassign */
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

    const earliestAllowedDate = new Date(Date.now() - maxRetentionMs);

    // If no after date is provided, default to the earliest allowed date
    const effectiveAfterDate = after ? new Date(after) : earliestAllowedDate;
    const effectiveBeforeDate = before ? new Date(before) : new Date();

    this.validateDateRange(earliestAllowedDate, effectiveAfterDate, effectiveBeforeDate);

    return {
      after: effectiveAfterDate.toISOString(),
      before: effectiveBeforeDate.toISOString(),
    };
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
    const { apiServiceLevel, createdAt } = organization;

    if (apiServiceLevel === ApiServiceLevelEnum.FREE && new Date(createdAt) < new Date('2025-02-28')) {
      // 30 days for free tier before 28 Feb 2025
      return 30 * 24 * 60 * 60 * 1000;
    }

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
    return await this.notificationRepository.getFeed(
      command.environmentId,
      {
        channels: command.channels,
        templates: command.templates,
        subscriberIds: subscriberIds || [],
        transactionId: command.transactionId,
        topicKey: command.topicKey,
        after: command.after,
        before: command.before,
      },
      command.page * command.limit,
      command.limit
    );
  }
}
