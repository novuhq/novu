import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import {
  AnalyticsService,
  buildFeedKey,
  buildMessageCountKey,
  buildSubscriberKey,
  CachedResponse,
  InvalidateCacheService,
  messageWebhookMapper,
  SendWebhookMessage,
  WebSocketsQueueService,
} from '@novu/application-generic';
import {
  EnvironmentRepository,
  MessageEntity,
  MessageRepository,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import { MessagesStatusEnum, WebhookEventEnum, WebhookObjectTypeEnum } from '@novu/shared';
import { mapMarkMessageToWebSocketEvent } from '../../../shared/helpers';
import { MessageResponseDto } from '../../dtos/message-response.dto';
import { MarkMessageAsByMarkCommand } from './mark-message-as-by-mark.command';

@Injectable()
export class MarkMessageAsByMark {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private messageRepository: MessageRepository,
    private webSocketsQueueService: WebSocketsQueueService,
    private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository,
    private sendWebhookMessage: SendWebhookMessage,
    private environmentRepository: EnvironmentRepository
  ) {}

  async execute(command: MarkMessageAsByMarkCommand): Promise<MessageResponseDto[]> {
    const subscriber = await this.fetchSubscriber({
      _environmentId: command.environmentId,
      subscriberId: command.subscriberId,
    });

    if (!subscriber) throw new NotFoundException(`Subscriber ${command.subscriberId} not found`);

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

    const updatedMessages = await this.messageRepository.changeMessagesStatus({
      environmentId: command.environmentId,
      subscriberId: subscriber._id,
      messageIds: command.messageIds,
      markAs: command.markAs,
    });

    await this.updateServices(command, subscriber, updatedMessages, command.markAs);

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

    return updatedMessages.map(mapMessageEntityToResponseDto);
  }

  private async updateServices(command: MarkMessageAsByMarkCommand, subscriber, messages, markAs: MessagesStatusEnum) {
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

  private updateSocketCount(subscriber: SubscriberEntity, markAs: MessagesStatusEnum) {
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

  @CachedResponse({
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
export function mapMessageEntityToResponseDto(entity: MessageEntity): MessageResponseDto {
  const responseDto = new MessageResponseDto();

  responseDto._id = entity._id;
  responseDto._templateId = entity._templateId;
  responseDto._environmentId = entity._environmentId;
  responseDto._messageTemplateId = entity._messageTemplateId;
  responseDto._organizationId = entity._organizationId;
  responseDto._notificationId = entity._notificationId;
  responseDto._subscriberId = entity._subscriberId;
  responseDto.templateIdentifier = entity.templateIdentifier;
  responseDto.createdAt = entity.createdAt;
  responseDto.lastSeenDate = entity.lastSeenDate;
  responseDto.lastReadDate = entity.lastReadDate;
  responseDto.content = entity.content; // Assuming content can be directly assigned
  responseDto.transactionId = entity.transactionId;
  responseDto.subject = entity.subject;
  responseDto.channel = entity.channel;
  responseDto.read = entity.read;
  responseDto.seen = entity.seen;
  responseDto.snoozedUntil = entity.snoozedUntil;
  responseDto.deliveredAt = entity.deliveredAt; // snoozed notifications can have multiple delivery dates
  responseDto.email = entity.email;
  responseDto.phone = entity.phone;
  responseDto.directWebhookUrl = entity.directWebhookUrl;
  responseDto.providerId = entity.providerId;
  responseDto.deviceTokens = entity.deviceTokens;
  responseDto.title = entity.title;
  responseDto.cta = entity.cta; // Assuming cta can be directly assigned
  responseDto._feedId = entity._feedId ?? null; // Handle optional _feedId
  responseDto.status = entity.status;
  responseDto.errorId = entity.errorId;
  responseDto.errorText = entity.errorText;
  responseDto.payload = entity.payload;
  responseDto.overrides = entity.overrides;

  return responseDto;
}
