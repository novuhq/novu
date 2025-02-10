import { Injectable } from '@nestjs/common';
import { NotificationFeedItemEntity, NotificationRepository, SubscriberRepository } from '@novu/dal';
import { Instrument } from '@novu/application-generic';
import { ActivitiesResponseDto } from '../../dtos/activities-response.dto';
import { GetActivityFeedCommand } from './get-activity-feed.command';
import { mapFeedItemToDto } from './map-feed-item-to.dto';

@Injectable()
export class GetActivityFeed {
  constructor(
    private subscribersRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository
  ) {}

  async execute(command: GetActivityFeedCommand): Promise<ActivitiesResponseDto> {
    let subscriberIds: string[] | undefined;

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

    return {
      page: command.page,
      hasMore: notifications?.length === command.limit,
      pageSize: command.limit,
      data: notifications.map((notification) => mapFeedItemToDto(notification)),
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
    return await this.notificationRepository.getFeed(
      command.environmentId,
      {
        channels: command.channels,
        templates: command.templates,
        subscriberIds: subscriberIds || [],
        transactionId: command.transactionId,
        after: command.after,
        before: command.before,
      },
      command.page * command.limit,
      command.limit
    );
  }
}
