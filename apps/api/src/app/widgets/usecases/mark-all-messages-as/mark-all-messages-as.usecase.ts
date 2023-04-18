import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import {
  WsQueueService,
  AnalyticsService,
  InvalidateCacheService,
  buildFeedKey,
  buildMessageCountKey,
} from '@novu/application-generic';
import { ChannelTypeEnum } from '@novu/shared';

import { MarkAllMessagesAsCommand } from './mark-all-messages-as.command';

@Injectable()
export class MarkAllMessagesAs {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private messageRepository: MessageRepository,
    private wsQueueService: WsQueueService,
    private subscriberRepository: SubscriberRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: MarkAllMessagesAsCommand): Promise<number> {
    await this.invalidateCache.invalidateQuery({
      key: buildFeedKey().invalidate({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    await this.invalidateCache.invalidateQuery({
      key: buildMessageCountKey().invalidate({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) {
      throw new NotFoundException(
        `Subscriber ${command.subscriberId} does not exist in environment ${command.environmentId}, ` +
          `please provide a valid subscriber identifier`
      );
    }

    const response = await this.messageRepository.markAllMessagesAs({
      subscriberId: subscriber._id,
      environmentId: command.environmentId,
      markAs: command.markAs,
      feedIdentifiers: command.feedIds,
      channel: ChannelTypeEnum.IN_APP,
    });

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
