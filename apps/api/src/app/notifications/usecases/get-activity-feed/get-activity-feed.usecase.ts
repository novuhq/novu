import { Injectable } from '@nestjs/common';
import { SubscriberRepository, NotificationRepository } from '@novu/dal';
import { ActivitiesResponseDto } from '../../dtos/activities-response.dto';
import { GetActivityFeedCommand } from './get-activity-feed.command';
import { Instrument } from '@novu/application-generic';

@Injectable()
export class GetActivityFeed {
  constructor(
    private subscribersRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository
  ) {}

  async execute(command: GetActivityFeedCommand): Promise<ActivitiesResponseDto> {
    const LIMIT = 10;

    let subscriberIds: string[] = [];

    if (command.search || command.emails?.length || command.subscriberIds?.length) {
      const foundSubscribers = await this.findSubscribers(command);

      subscriberIds = foundSubscribers.map((subscriber) => subscriber._id);

      if (subscriberIds.length === 0) {
        return {
          page: 0,
          hasMore: false,
          pageSize: LIMIT,
          data: [],
        };
      }
    }

    const { notifications } = await this.getFeedNotifications(command, subscriberIds, LIMIT);

    return {
      page: command.page,
      hasMore: notifications?.length === LIMIT,
      pageSize: LIMIT,
      data: notifications,
    };
  }

  @Instrument()
  private async findSubscribers(command: GetActivityFeedCommand) {
    const foundSubscribers = await this.subscribersRepository.searchSubscribers(
      command.environmentId,
      command.subscriberIds,
      command.emails,
      command.search
    );

    return foundSubscribers;
  }

  @Instrument()
  private async getFeedNotifications(command: GetActivityFeedCommand, subscriberIds: string[], LIMIT: number) {
    const { data: notifications } = await this.notificationRepository.getFeed(
      command.environmentId,
      { channels: command.channels, templates: command.templates, subscriberIds, transactionId: command.transactionId },
      command.page * LIMIT,
      LIMIT
    );

    return { notifications };
  }
}
