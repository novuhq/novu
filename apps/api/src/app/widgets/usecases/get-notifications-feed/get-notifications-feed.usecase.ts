import { Inject, Injectable } from '@nestjs/common';
import { MessageEntity, MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { GetNotificationsFeedCommand } from './get-notifications-feed.command';

@Injectable()
export class GetNotificationsFeed {
  constructor(
    private messageRepository: MessageRepository,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: GetNotificationsFeedCommand): Promise<MessageEntity[]> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    const feed = await this.messageRepository.findBySubscriberChannel(
      command.environmentId,
      subscriber._id,
      ChannelTypeEnum.IN_APP,
      { feedId: command.feedId, seen: command.seen },
      {
        limit: 10,
        skip: command.page * 10,
      }
    );

    let sampleFeedItem: MessageEntity;
    if (feed.length) {
      sampleFeedItem = feed[0];
    }

    if (sampleFeedItem) {
      this.analyticsService.track('Fetch Feed - [Notification Center]', command.organizationId, {
        _subscriber: sampleFeedItem._subscriberId,
        _organization: command.organizationId,
        feedSize: feed.length,
      });
    }

    return feed;
  }
}
