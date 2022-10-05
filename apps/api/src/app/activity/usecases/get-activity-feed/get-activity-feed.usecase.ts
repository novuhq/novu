import { Injectable } from '@nestjs/common';
import { SubscriberRepository, NotificationRepository } from '@novu/dal';
import { ActivitiesResponseDto } from '../../dtos/activities-response.dto';
import { GetActivityFeedCommand } from './get-activity-feed.command';

@Injectable()
export class GetActivityFeed {
  constructor(
    private subscribersRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository
  ) {}

  async execute(command: GetActivityFeedCommand): Promise<any> {
    const LIMIT = 10;

    const subscriberIds = [];
    if (command.emails) {
      const ids = await this.subscribersRepository.find(
        {
          email: {
            $in: command.emails,
          },
        },
        '_id'
      );
      subscriberIds.push(...ids);
      if (subscriberIds.length === 0) {
        return {
          page: 0,
          totalCount: 0,
          pageSize: LIMIT,
          data: [],
        };
      }
    }

    if (command.search) {
      const foundSubscriber = await this.subscribersRepository.searchSubscriber(command.environmentId, command.search);

      const subscriberId = foundSubscriber?._id;

      if (!subscriberId) {
        return {
          page: 0,
          totalCount: 0,
          pageSize: LIMIT,
          data: [],
        };
      }
      subscriberIds.push(subscriberId);
    }

    const { data: messages, totalCount } = await this.notificationRepository.getFeed(
      command.environmentId,
      { channels: command.channels, templates: command.templates, subscriberIds },
      command.page * LIMIT,
      LIMIT
    );

    return {
      page: command.page,
      totalCount,
      pageSize: LIMIT,
      data: messages,
    };
  }
}
