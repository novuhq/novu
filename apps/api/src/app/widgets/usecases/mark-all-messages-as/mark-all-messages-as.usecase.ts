import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import {
  WebSocketsQueueService,
  AnalyticsService,
  InvalidateCacheService,
  buildFeedKey,
  buildMessageCountKey,
} from '@novu/application-generic';
import { ChannelTypeEnum, MarkMessagesAsEnum, WebSocketEventEnum } from '@novu/shared';

import { MarkAllMessagesAsCommand } from './mark-all-messages-as.command';

@Injectable()
export class MarkAllMessagesAs {
  constructor(
    @Inject(InvalidateCacheService)
    private invalidateCache: InvalidateCacheService,
    private messageRepository: MessageRepository,
    private webSocketsQueueService: WebSocketsQueueService,
    private subscriberRepository: SubscriberRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: MarkAllMessagesAsCommand): Promise<number> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) {
      throw new NotFoundException(
        `Subscriber ${command.subscriberId} does not exist in environment ${command.environmentId}, ` +
          `please provide a valid subscriber identifier`
      );
    }

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

    const response = await this.messageRepository.markAllMessagesAs({
      subscriberId: subscriber._id,
      environmentId: command.environmentId,
      markAs: command.markAs,
      feedIdentifiers: command.feedIdentifiers,
      channel: ChannelTypeEnum.IN_APP,
    });

    const isUnreadCountChanged =
      command.markAs === MarkMessagesAsEnum.READ || command.markAs === MarkMessagesAsEnum.UNREAD;

    const countQuery = isUnreadCountChanged ? { read: false } : { seen: false };

    const count = await this.messageRepository.getCount(
      command.environmentId,
      subscriber._id,
      ChannelTypeEnum.IN_APP,
      countQuery
    );

    this.webSocketsQueueService.add(
      'sendMessage',
      {
        event: isUnreadCountChanged ? WebSocketEventEnum.UNREAD : WebSocketEventEnum.UNSEEN,
        userId: subscriber._id,
        _environmentId: command.environmentId,
      },
      subscriber._organizationId
    );

    this.analyticsService.track(
      `Mark all messages as ${command.markAs}- [Notification Center]`,
      command.organizationId,
      {
        _organization: command.organizationId,
        _subscriberId: subscriber._id,
        feedIds: command.feedIdentifiers,
        markAs: command.markAs,
      }
    );

    return response.modified;
  }
}
