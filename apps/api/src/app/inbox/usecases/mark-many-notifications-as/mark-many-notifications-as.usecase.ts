import { BadRequestException, Injectable } from '@nestjs/common';
import {
  buildFeedKey,
  buildMessageCountKey,
  EventType,
  InvalidateCacheService,
  LogRepository,
  MessageInteractionService,
  MessageInteractionTrace,
  mapEventTypeToTitle,
  messageWebhookMapper,
  PinoLogger,
  SendWebhookMessage,
  StepType,
  WebSocketsQueueService,
} from '@novu/application-generic';
import { EnvironmentEntity, EnvironmentRepository, MessageEntity, MessageRepository } from '@novu/dal';
import { WebhookEventEnum, WebhookObjectTypeEnum, WebSocketEventEnum } from '@novu/shared';

import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import { MarkManyNotificationsAsCommand } from './mark-many-notifications-as.command';

@Injectable()
export class MarkManyNotificationsAs {
  constructor(
    private invalidateCacheService: InvalidateCacheService,
    private webSocketsQueueService: WebSocketsQueueService,
    private getSubscriber: GetSubscriber,
    private messageRepository: MessageRepository,
    private messageInteractionService: MessageInteractionService,
    private logger: PinoLogger,
    private sendWebhookMessage: SendWebhookMessage,
    private environmentRepository: EnvironmentRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: MarkManyNotificationsAsCommand): Promise<void> {
    const subscriber = await this.getSubscriber.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
    });
    if (!subscriber) {
      throw new BadRequestException(`Subscriber with id: ${command.subscriberId} is not found.`);
    }

    const updatedMessages = await this.messageRepository.updateMessagesStatusByIds({
      environmentId: command.environmentId,
      subscriberId: subscriber._id,
      ids: command.ids,
      read: command.read,
      archived: command.archived,
      snoozedUntil: command.snoozedUntil,
    });

    await this.logTraces({
      command,
      subscriberId: subscriber.subscriberId,
      _subscriberId: subscriber._id,
      messages: updatedMessages,
    });

    await this.invalidateCacheService.invalidateQuery({
      key: buildFeedKey().invalidate({
        subscriberId: subscriber.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    await this.invalidateCacheService.invalidateQuery({
      key: buildMessageCountKey().invalidate({
        subscriberId: subscriber.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    const environment = await this.environmentRepository.findOne(
      {
        _id: command.environmentId,
      },
      'webhookAppId identifier'
    );
    if (!environment) {
      throw new Error(`Environment not found for id ${command.environmentId}`);
    }

    const eventTypes: WebhookEventEnum[] = [];

    if (command.read !== undefined) {
      const eventType = command.read ? WebhookEventEnum.MESSAGE_READ : WebhookEventEnum.MESSAGE_UNREAD;
      eventTypes.push(eventType);
    }

    if (command.archived !== undefined) {
      const eventType = command.archived ? WebhookEventEnum.MESSAGE_ARCHIVED : WebhookEventEnum.MESSAGE_UNARCHIVED;
      eventTypes.push(eventType);
    }

    if (command.snoozedUntil !== undefined) {
      // do not change to !== null, as null is a indication of unsnooze
      const eventType = command.snoozedUntil ? WebhookEventEnum.MESSAGE_SNOOZED : WebhookEventEnum.MESSAGE_UNSNOOZED;
      eventTypes.push(eventType);
    }

    await this.processWebhooksInBatches(eventTypes, updatedMessages, command, environment);

    this.webSocketsQueueService.add({
      name: 'sendMessage',
      data: {
        event: WebSocketEventEnum.UNREAD,
        userId: subscriber._id,
        _environmentId: subscriber._environmentId,
      },
      groupId: subscriber._organizationId,
    });
  }

  private async processWebhooksInBatches(
    eventTypes: WebhookEventEnum[],
    messages: MessageEntity[],
    command: MarkManyNotificationsAsCommand,
    environment: EnvironmentEntity
  ): Promise<void> {
    const BATCH_SIZE = 100;
    const messageChunks = this.chunkArray(messages, BATCH_SIZE);

    for (const messageChunk of messageChunks) {
      const webhookPromises: Promise<{ eventId: string } | undefined>[] = [];

      for (const eventType of eventTypes) {
        webhookPromises.push(...this.sendWebhookEvents(messageChunk, eventType, command, environment));
      }

      await Promise.all(webhookPromises);
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }

    return chunks;
  }

  private sendWebhookEvents(
    updatedMessages: MessageEntity[],
    eventType: WebhookEventEnum,
    command: MarkManyNotificationsAsCommand,
    environment: EnvironmentEntity
  ): Promise<{ eventId: string } | undefined>[] {
    return updatedMessages.map((message) =>
      this.sendWebhookMessage.execute({
        eventType: eventType,
        objectType: WebhookObjectTypeEnum.MESSAGE,
        payload: {
          object: messageWebhookMapper(message, command.subscriberId),
        },
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        environment: environment,
      })
    );
  }

  private async logTraces({
    command,
    subscriberId,
    _subscriberId,
    messages,
  }: {
    command: MarkManyNotificationsAsCommand;
    subscriberId: string;
    _subscriberId: string;
    messages?: MessageEntity[];
  }): Promise<void> {
    if (!messages || !Array.isArray(messages)) {
      return;
    }

    const allTraceData: MessageInteractionTrace[] = [];

    for (const message of messages) {
      if (!message._jobId) continue;

      if (command.read !== undefined) {
        allTraceData.push(
          createTraceLog({
            message,
            command,
            eventType: command.read ? 'message_read' : 'message_unread',
            subscriberId,
            _subscriberId,
          })
        );
      }

      if (command.snoozedUntil !== undefined) {
        allTraceData.push(
          createTraceLog({
            message,
            command,
            eventType: 'message_snoozed',
            subscriberId,
            _subscriberId,
          })
        );
      }

      if (command.archived !== undefined) {
        allTraceData.push(
          createTraceLog({
            message,
            command,
            eventType: command.archived ? 'message_archived' : 'message_unarchived',
            subscriberId,
            _subscriberId,
          })
        );
      }
    }

    if (allTraceData.length > 0) {
      try {
        await this.messageInteractionService.trace(allTraceData);
      } catch (error) {
        this.logger.warn({ err: error }, `Failed to create engagement traces for ${allTraceData.length} messages`);
      }
    }
  }
}

function createTraceLog({
  message,
  command,
  eventType,
  subscriberId,
  _subscriberId,
}: {
  message: MessageEntity;
  command: MarkManyNotificationsAsCommand;
  eventType: EventType;
  subscriberId: string;
  _subscriberId: string;
}): MessageInteractionTrace {
  return {
    created_at: LogRepository.formatDateTime64(new Date()),
    organization_id: message._organizationId,
    environment_id: message._environmentId,
    user_id: command.subscriberId,
    subscriber_id: _subscriberId,
    external_subscriber_id: subscriberId,
    event_type: eventType,
    title: mapEventTypeToTitle(eventType),
    message: `Message ${eventType.replace('message_', '')} for subscriber ${message._subscriberId}`,
    raw_data: null,
    status: 'success',
    entity_type: 'step_run',
    entity_id: message._jobId,
    step_run_type: message.channel as StepType,
    workflow_run_identifier: message.templateIdentifier,
    _notificationId: message._notificationId,
  };
}
