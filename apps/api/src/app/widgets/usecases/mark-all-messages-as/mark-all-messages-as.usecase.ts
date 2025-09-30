import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import {
  AnalyticsService,
  buildFeedKey,
  buildMessageCountKey,
  InvalidateCacheService,
  messageWebhookMapper,
  SendWebhookMessage,
  WebSocketsQueueService,
} from '@novu/application-generic';
import { EnvironmentRepository, MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum, MessagesStatusEnum, WebhookEventEnum, WebhookObjectTypeEnum } from '@novu/shared';
import { mapMarkMessageToWebSocketEvent } from '../../../shared/helpers';
import { MarkAllMessagesAsCommand } from './mark-all-messages-as.command';

@Injectable()
export class MarkAllMessagesAs {
  constructor(
    @Inject(InvalidateCacheService)
    private invalidateCache: InvalidateCacheService,
    private messageRepository: MessageRepository,
    private webSocketsQueueService: WebSocketsQueueService,
    private subscriberRepository: SubscriberRepository,
    private analyticsService: AnalyticsService,
    private sendWebhookMessage: SendWebhookMessage,
    private environmentRepository: EnvironmentRepository
  ) {}

  async execute(command: MarkAllMessagesAsCommand): Promise<number> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) {
      throw new NotFoundException(
        `Subscriber ${command.subscriberId} does not exist in environment ${command.environmentId}, ` +
          `please provide a valid subscriber identifier`
      );
    }
    const environment = await this.environmentRepository.findOne(
      {
        _id: command.environmentId,
      },
      'webhookAppId identifier'
    );
    if (!environment) {
      throw new Error(`Environment not found for id ${command.environmentId}`);
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

    const updatedMessages = await this.messageRepository.markAllMessagesAs({
      subscriberId: subscriber._id,
      environmentId: command.environmentId,
      markAs: command.markAs,
      feedIdentifiers: command.feedIdentifiers,
      channel: ChannelTypeEnum.IN_APP,
    });

    if (command.markAs !== MessagesStatusEnum.UNSEEN) {
      let eventType = WebhookEventEnum.MESSAGE_SEEN;
      if (command.markAs === MessagesStatusEnum.READ) {
        eventType = WebhookEventEnum.MESSAGE_READ;
      } else if (command.markAs === MessagesStatusEnum.UNREAD) {
        eventType = WebhookEventEnum.MESSAGE_UNREAD;
      }

      const webhookPromises = updatedMessages.map((message) =>
        this.sendWebhookMessage.execute({
          eventType: eventType,
          objectType: WebhookObjectTypeEnum.MESSAGE,
          payload: {
            object: messageWebhookMapper(message, command.subscriberId),
          },
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          environment,
        })
      );

      await Promise.all(webhookPromises);
    }

    const eventMessage = mapMarkMessageToWebSocketEvent(command.markAs);

    if (eventMessage !== undefined) {
      this.webSocketsQueueService.add({
        name: 'sendMessage',
        data: {
          event: eventMessage,
          userId: subscriber._id,
          _environmentId: command.environmentId,
        },
        groupId: subscriber._organizationId,
      });
    }

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

    return updatedMessages.length;
  }
}
