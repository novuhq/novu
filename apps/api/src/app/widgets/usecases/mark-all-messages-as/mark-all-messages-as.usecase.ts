import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import { WsQueueService, AnalyticsService, CacheKeyPrefixEnum, InvalidateCache } from '@novu/application-generic';

import { MarkAllMessagesAsCommand } from './mark-all-messages-as.command';

@Injectable()
export class MarkAllMessagesAs {
  constructor(
    private messageRepository: MessageRepository,
    private wsQueueService: WsQueueService,
    private subscriberRepository: SubscriberRepository,
    private analyticsService: AnalyticsService
  ) {}

  @InvalidateCache([CacheKeyPrefixEnum.MESSAGE_COUNT, CacheKeyPrefixEnum.FEED])
  async execute(command: MarkAllMessagesAsCommand): Promise<number> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) {
      throw new NotFoundException(
        `Subscriber ${command.subscriberId} does not exist in environment ${command.environmentId}, ` +
          `please provide a valid subscriber identifier`
      );
    }

    const response = await this.messageRepository.markAllMessagesAs(
      subscriber._id,
      command.environmentId,
      command.markAs,
      command.feedIds
    );

    this.wsQueueService.bullMqService.add(
      'sendMessage',
      {
        event: 'unseen_count_changed',
        userId: subscriber._id,
        payload: {
          unseenCount: 0,
        },
      },
      {},
      subscriber._organizationId
    );

    if (command.markAs === 'read') {
      await this.wsQueueService.bullMqService.add(
        'sendMessage',
        {
          event: 'unread_count_changed',
          userId: subscriber._id,
          payload: {
            unreadCount: 0,
          },
        },
        {},
        subscriber._organizationId
      );
    }

    this.analyticsService.track(
      `Mark all messages as ${command.markAs}- [Notification Center]`,
      command.organizationId,
      {
        _organization: command.organizationId,
        _subscriberId: subscriber._id,
        feedIds: command.feedIds,
        markAs: command.markAs,
      }
    );

    return response.modified;
  }
}
