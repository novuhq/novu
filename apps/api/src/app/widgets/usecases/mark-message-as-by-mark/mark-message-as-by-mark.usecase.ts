import { Injectable, NotFoundException } from '@nestjs/common';

import { MessageEntity, MessageRepository, SubscriberRepository, SubscriberEntity } from '@novu/dal';
import { MarkMessagesAsEnum, WebSocketEventEnum } from '@novu/shared';
import {
  WebSocketsQueueService,
  AnalyticsService,
  InvalidateCacheService,
  CachedEntity,
  buildFeedKey,
  buildMessageCountKey,
  buildSubscriberKey,
} from '@novu/application-generic';

import { MarkMessageAsByMarkCommand } from './mark-message-as-by-mark.command';
import { mapMarkMessageToWebSocketEvent } from '../../../shared/helpers';

@Injectable()
export class MarkMessageAsByMark {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private messageRepository: MessageRepository,
    private webSocketsQueueService: WebSocketsQueueService,
    private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: MarkMessageAsByMarkCommand): Promise<MessageEntity[]> {
    const subscriber = await this.fetchSubscriber({
      _environmentId: command.environmentId,
      subscriberId: command.subscriberId,
    });

    if (!subscriber) throw new NotFoundException(`Subscriber ${command.subscriberId} not found`);

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

    await this.messageRepository.changeMessagesStatus({
      environmentId: command.environmentId,
      subscriberId: subscriber._id,
      messageIds: command.messageIds,
      markAs: command.markAs,
    });

    const messages = await this.messageRepository.find({
      _environmentId: command.environmentId,
      _id: {
        $in: command.messageIds,
      },
    });

    await this.updateServices(command, subscriber, messages, command.markAs);

    return messages;
  }

  private async updateServices(command: MarkMessageAsByMarkCommand, subscriber, messages, markAs: MarkMessagesAsEnum) {
    this.updateSocketCount(subscriber, markAs);
    const analyticMessage =
      command.__source === 'notification_center'
        ? `Mark as ${markAs} - [Notification Center]`
        : `Mark as ${markAs} - [API]`;

    for (const message of messages) {
      this.analyticsService.mixpanelTrack(analyticMessage, '', {
        _subscriber: message._subscriberId,
        _organization: command.organizationId,
        _template: message._templateId,
      });
    }
  }

  private updateSocketCount(subscriber: SubscriberEntity, markAs: MarkMessagesAsEnum) {
    const eventMessage = mapMarkMessageToWebSocketEvent(markAs);

    if (eventMessage === undefined) {
      return;
    }

    this.webSocketsQueueService.add({
      name: 'sendMessage',
      data: {
        event: eventMessage,
        userId: subscriber._id,
        _environmentId: subscriber._environmentId,
      },
      groupId: subscriber._organizationId,
    });
  }

  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  private async fetchSubscriber({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): Promise<SubscriberEntity | null> {
    return await this.subscriberRepository.findBySubscriberId(_environmentId, subscriberId);
  }
}
