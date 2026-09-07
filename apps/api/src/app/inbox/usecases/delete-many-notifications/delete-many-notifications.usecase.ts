import { BadRequestException, Injectable } from '@nestjs/common';
import {
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
import { DeliveryLifecycleStatusEnum, WebhookEventEnum, WebhookObjectTypeEnum, WebSocketEventEnum } from '@novu/shared';

import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import { DeleteManyNotificationsCommand } from './delete-many-notifications.command';

@Injectable()
export class DeleteManyNotifications {
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

  async execute(command: DeleteManyNotificationsCommand): Promise<void> {
    const subscriber = await this.getSubscriber.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
    });
    if (!subscriber) {
      throw new BadRequestException(`Subscriber with id: ${command.subscriberId} is not found.`);
    }

    const deletedMessages = await this.messageRepository.deleteMessagesByIds({
      environmentId: command.environmentId,
      subscriberId: subscriber._id,
      ids: command.ids,
    });

    await this.logTraces({
      command,
      subscriberId: subscriber.subscriberId,
      _subscriberId: subscriber._id,
      messages: deletedMessages,
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

    await this.processWebhooksInBatches([WebhookEventEnum.MESSAGE_DELETED], deletedMessages, command, environment);

    this.webSocketsQueueService.add({
      name: 'sendMessage',
      data: {
        event: WebSocketEventEnum.UNREAD,
        userId: subscriber._id,
        _environmentId: subscriber._environmentId,
        contextKeys: command.contextKeys ?? [],
      },
      groupId: subscriber._organizationId,
    });
  }

  private async processWebhooksInBatches(
    eventTypes: WebhookEventEnum[],
    messages: MessageEntity[],
    command: DeleteManyNotificationsCommand,
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
    deletedMessages: MessageEntity[],
    eventType: WebhookEventEnum,
    command: DeleteManyNotificationsCommand,
    environment: EnvironmentEntity
  ): Promise<{ eventId: string } | undefined>[] {
    return deletedMessages.map((message) =>
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
    command: DeleteManyNotificationsCommand;
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

      allTraceData.push(
        createTraceLog({
          message,
          command,
          eventType: 'message_deleted',
          subscriberId,
          _subscriberId,
        })
      );
    }

    if (allTraceData.length > 0) {
      try {
        await this.messageInteractionService.trace(allTraceData, DeliveryLifecycleStatusEnum.INTERACTED);
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
  command: DeleteManyNotificationsCommand;
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
    raw_data: '',
    status: 'success',
    entity_id: message._jobId,
    step_run_type: message.channel as StepType,
    workflow_run_identifier: '',
    _notificationId: message._notificationId,
    workflow_id: message._templateId,
    provider_id: '',
  };
}
