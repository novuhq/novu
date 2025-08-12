import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AnalyticsService,
  buildFeedKey,
  buildMessageCountKey,
  InvalidateCacheService,
  messageWebhookMapper,
  SendWebhookMessage,
  WebSocketsQueueService,
} from '@novu/application-generic';
import { MessageEntity, MessageRepository } from '@novu/dal';
import { WebhookEventEnum, WebhookObjectTypeEnum, WebSocketEventEnum } from '@novu/shared';

import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import { AnalyticsEventsEnum } from '../../utils';
import { validateDataStructure } from '../../utils/validate-data';
import { UpdateAllNotificationsCommand } from './update-all-notifications.command';

@Injectable()
export class UpdateAllNotifications {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private getSubscriber: GetSubscriber,
    private analyticsService: AnalyticsService,
    private messageRepository: MessageRepository,
    private webSocketsQueueService: WebSocketsQueueService,
    private sendWebhookMessage: SendWebhookMessage
  ) {}

  async execute(command: UpdateAllNotificationsCommand): Promise<void> {
    const subscriber = await this.getSubscriber.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
    });

    if (!subscriber) {
      throw new BadRequestException(`Subscriber with id: ${command.subscriberId} is not found.`);
    }

    let parsedData: unknown;
    if (command.from.data) {
      try {
        parsedData = JSON.parse(command.from.data);
        validateDataStructure(parsedData);
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }

        throw new BadRequestException('Invalid JSON format for data parameter');
      }
    }

    const fromField: Record<string, unknown> = {
      ...command.from,
    };

    if (parsedData) {
      fromField.data = parsedData;
    }

    const updatedMessages = await this.messageRepository.updateMessagesFromToStatus({
      environmentId: command.environmentId,
      subscriberId: subscriber._id,
      from: fromField,
      to: command.to,
    });

    await this.sendWebhookEvents(command, updatedMessages);

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

    this.analyticsService.track(AnalyticsEventsEnum.UPDATE_ALL_NOTIFICATIONS, '', {
      _organization: command.organizationId,
      _subscriberId: subscriber._id,
      from: command.from,
      to: command.to,
    });

    this.webSocketsQueueService.add({
      name: 'sendMessage',
      data: {
        event: WebSocketEventEnum.UNREAD,
        userId: subscriber._id,
        _environmentId: command.environmentId,
      },
      groupId: subscriber._organizationId,
    });
  }

  private async sendWebhookEvents(command: UpdateAllNotificationsCommand, updatedMessages: MessageEntity[]) {
    const webhookPromises: Promise<{ eventId: string } | undefined>[] = [];

    if (command.to.read !== undefined) {
      const eventType = command.to.read ? WebhookEventEnum.MESSAGE_READ : WebhookEventEnum.MESSAGE_UNREAD;
      webhookPromises.push(...this.createWebhookPromises(eventType, updatedMessages, command));
    }

    if (command.to.archived !== undefined) {
      const eventType = command.to.archived ? WebhookEventEnum.MESSAGE_ARCHIVED : WebhookEventEnum.MESSAGE_UNARCHIVED;
      webhookPromises.push(...this.createWebhookPromises(eventType, updatedMessages, command));
    }

    await Promise.all(webhookPromises);
  }

  private createWebhookPromises(
    eventType: WebhookEventEnum,
    messages: MessageEntity[],
    command: UpdateAllNotificationsCommand
  ): Promise<{ eventId: string } | undefined>[] {
    return messages.map((message) =>
      this.sendWebhookMessage.execute({
        eventType,
        objectType: WebhookObjectTypeEnum.MESSAGE,
        payload: {
          object: messageWebhookMapper(message),
        },
        organizationId: command.organizationId,
        environmentId: command.environmentId,
      })
    );
  }
}
