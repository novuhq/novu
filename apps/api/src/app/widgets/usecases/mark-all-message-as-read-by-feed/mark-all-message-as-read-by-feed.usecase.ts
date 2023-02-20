import { Inject, Injectable } from '@nestjs/common';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import { AnalyticsService } from '@novu/application-generic';

import { CacheKeyPrefixEnum } from '../../../shared/services/cache';
import { QueueService } from '../../../shared/services/queue';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';

import { InvalidateCache } from '../../../shared/interceptors';
import { MarkAllMessageAsReadByFeedCommand } from './mark-all-message-as-read-by-feed.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class MarkAllMessageAsReadByFeed {
  constructor(
    private messageRepository: MessageRepository,
    private queueService: QueueService,
    private subscriberRepository: SubscriberRepository,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  @InvalidateCache([CacheKeyPrefixEnum.MESSAGE_COUNT, CacheKeyPrefixEnum.FEED])
  async execute(command: MarkAllMessageAsReadByFeedCommand): Promise<number> {
    const feedId = command.feedId ? [command.feedId] : null;
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) {
      throw new ApiException(
        `Subscriber ${command.subscriberId} does not exist in environment ${command.environmentId}, ` +
          `please provide a valid subscriber identifier`
      );
    }
    const response = await this.messageRepository.markAllUnreadAsReadByFeed(
      subscriber._id,
      command.environmentId,
      feedId
    );

    this.queueService.wsSocketQueue.add({
      event: 'unseen_count_changed',
      userId: subscriber._id,
      payload: {
        unseenCount: 0,
      },
    });

    await this.queueService.wsSocketQueue.add({
      event: 'unread_count_changed',
      userId: subscriber._id,
      payload: {
        unreadCount: 0,
      },
    });

    this.analyticsService.track('Mark all message as read by Feed - [Notification Center]', command.organizationId, {
      _organization: command.organizationId,
      _subscriberId: subscriber._id,
      feedId,
    });

    return response.modified;
  }
}
