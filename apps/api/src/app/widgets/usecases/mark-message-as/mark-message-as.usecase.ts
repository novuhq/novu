import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  buildFeedKey,
  buildMessageCountKey,
  buildSubscriberKey,
  CachedResponse,
  EventType,
  InvalidateCacheService,
  LogRepository,
  mapEventTypeToTitle,
  MessageInteractionService,
  MessageInteractionTrace,
  messageWebhookMapper,
  PinoLogger,
  SendWebhookMessage,
  StepType,
  Trace,
  WebSocketsQueueService,
} from '@novu/application-generic';
import { MessageEntity, MessageRepository, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { WebhookEventEnum, WebhookObjectTypeEnum, WebSocketEventEnum } from '@novu/shared';

import { MarkEnum, MarkMessageAsCommand } from './mark-message-as.command';

@Injectable()
export class MarkMessageAs {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private messageRepository: MessageRepository,
    private webSocketsQueueService: WebSocketsQueueService,
    private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository,
    private messageInteractionService: MessageInteractionService,
    private logger: PinoLogger,
    private sendWebhookMessage: SendWebhookMessage
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: MarkMessageAsCommand): Promise<MessageEntity[]> {
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

    const subscriber = await this.fetchSubscriber({
      _environmentId: command.environmentId,
      subscriberId: command.subscriberId,
    });

    if (!subscriber) throw new NotFoundException(`Subscriber ${command.subscriberId} not found`);

    await this.messageRepository.changeStatus(command.environmentId, subscriber._id, command.messageIds, command.mark);

    const updatedMessages = await this.messageRepository.find({
      _environmentId: command.environmentId,
      _id: {
        $in: command.messageIds,
      },
    });

    const allTraceData: MessageInteractionTrace[] = [];

    if (command.mark.seen != null) {
      await this.updateServices(command, subscriber, updatedMessages, MarkEnum.SEEN);

      allTraceData.push(...this.prepareTrace(
        updatedMessages,
        command.mark.seen ? 'message_seen' : 'message_unseen',
        command.subscriberId
      ));

      if (command.mark.seen === true) {
        await this.sendWebhookForMessages(
          updatedMessages,
          WebhookEventEnum.MESSAGE_SEEN,
          command.organizationId,
          command.environmentId,
          command.subscriberId
        );
      }
    }

    if (command.mark.read !== undefined || command.mark.read !== null) {
      await this.updateServices(command, subscriber, updatedMessages, MarkEnum.READ);

      allTraceData.push(...this.prepareTrace(
        updatedMessages,
        command.mark.read ? 'message_read' : 'message_unread',
        command.subscriberId
      ));

      await this.sendWebhookForMessages(
        updatedMessages,
        command.mark.read ? WebhookEventEnum.MESSAGE_READ : WebhookEventEnum.MESSAGE_UNREAD,
        command.organizationId,
        command.environmentId,
        command.subscriberId
      );
    }

    if (allTraceData.length > 0) {
      try {
        await this.messageInteractionService.trace(allTraceData);
      } catch (error) {
        this.logger.warn({ err: error }, `Failed to create engagement traces for ${allTraceData.length} traces`);
      }
    }

    return updatedMessages;
  }

  private prepareTrace(
    messages: MessageEntity[],
    eventType: EventType,
    userId: string
  ): MessageInteractionTrace[] {
    const traceDataArray: MessageInteractionTrace[] = [];

    for (const message of messages) {
      if (message._jobId) {
        traceDataArray.push({
          created_at: LogRepository.formatDateTime64(new Date()),
          organization_id: message._organizationId,
          environment_id: message._environmentId,
          user_id: userId,
          subscriber_id: message._subscriberId,
          event_type: eventType,
          title: mapEventTypeToTitle(eventType),
          message: `Message ${eventType.replace('message_', '')} for subscriber ${message._subscriberId}`,
          raw_data: null,
          status: 'success',
          entity_type: 'step_run',
          entity_id: message._jobId,
          external_subscriber_id: message._subscriberId,
          step_run_type: message.channel as StepType,
          workflow_run_identifier: message.templateIdentifier,
          _notificationId: message._notificationId,
        });
      }
    }

    return traceDataArray;
  }

  private async updateServices(command: MarkMessageAsCommand, subscriber, messages, marked: MarkEnum) {
    this.updateSocketCount(subscriber, marked);

    for (const message of messages) {
      this.analyticsService.mixpanelTrack(`Mark as ${marked} - [Notification Center]`, '', {
        _subscriber: message._subscriberId,
        _organization: command.organizationId,
        _template: message._templateId,
      });
    }
  }

  private updateSocketCount(subscriber: SubscriberEntity, mark: MarkEnum) {
    const eventMessage = mark === MarkEnum.READ ? WebSocketEventEnum.UNREAD : WebSocketEventEnum.UNSEEN;

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

  private async sendWebhookForMessages(
    messages: MessageEntity[],
    eventType: WebhookEventEnum,
    organizationId: string,
    environmentId: string,
    subscriberId: string
  ): Promise<void> {
    const webhookPromises = messages.map((message) =>
      this.sendWebhookMessage.execute({
        eventType: eventType,
        objectType: WebhookObjectTypeEnum.MESSAGE,
        payload: {
          object: messageWebhookMapper(message, subscriberId),
        },
        organizationId: organizationId,
        environmentId: environmentId,
      })
    );

    await Promise.all(webhookPromises);
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
