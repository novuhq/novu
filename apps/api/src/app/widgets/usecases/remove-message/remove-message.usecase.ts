import { DalException, MessageRepository, SubscriberRepository, SubscriberEntity } from '@novu/dal';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  WebSocketsQueueService,
  AnalyticsService,
  InvalidateCacheService,
  buildFeedKey,
  buildMessageCountKey,
} from '@novu/application-generic';
import { WebSocketEventEnum } from '@novu/shared';

import { RemoveMessageCommand } from './remove-message.command';
import { MarkEnum } from '../mark-message-as/mark-message-as.command';

@Injectable()
export class RemoveMessage {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private messageRepository: MessageRepository,
    private webSocketsQueueService: WebSocketsQueueService,
    private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: RemoveMessageCommand): Promise<void> {
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
    if (!subscriber) throw new NotFoundException(`Subscriber ${command.subscriberId} not found`);

    try {
      const deletedMessage = await this.messageRepository.delete({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _id: command.messageId,
        _subscriberId: command.subscriberId,
      });

      if (deletedMessage.deletedCount) {
        await Promise.all([
          this.updateServices(command, subscriber, command.messageId, MarkEnum.READ),
          this.updateServices(command, subscriber, command.messageId, MarkEnum.SEEN),
        ]);
      }
    } catch (e) {
      if (e instanceof DalException) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }

  private async updateServices(command: RemoveMessageCommand, subscriber, message, marked: MarkEnum) {
    await this.updateSocketCount(subscriber, marked);

    this.analyticsService.track(`Removed Message - [Notification Center]`, command.organizationId, {
      _subscriber: message._subscriberId,
      _organization: command.organizationId,
      _template: message._templateId,
    });
  }

  private async updateSocketCount(subscriber: SubscriberEntity, mark: MarkEnum) {
    const eventMessage = mark === MarkEnum.READ ? WebSocketEventEnum.UNREAD : WebSocketEventEnum.UNSEEN;

    await this.webSocketsQueueService.add({
      name: 'sendMessage',
      data: {
        event: eventMessage,
        userId: subscriber._id,
        _environmentId: subscriber._environmentId,
      },
      groupId: subscriber._organizationId,
    });
  }
}
