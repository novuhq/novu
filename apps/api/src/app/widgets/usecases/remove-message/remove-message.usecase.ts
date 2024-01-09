import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MessageEntity,
  DalException,
  MessageRepository,
  SubscriberRepository,
  SubscriberEntity,
  MemberRepository,
} from '@novu/dal';
import {
  WebSocketsQueueService,
  AnalyticsService,
  InvalidateCacheService,
  buildFeedKey,
  buildMessageCountKey,
} from '@novu/application-generic';
import { WebSocketEventEnum } from '@novu/shared';

import { RemoveMessageCommand } from './remove-message.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { MarkEnum } from '../mark-message-as/mark-message-as.command';

@Injectable()
export class RemoveMessage {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private messageRepository: MessageRepository,
    private webSocketsQueueService: WebSocketsQueueService,
    private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository,
    private memberRepository: MemberRepository
  ) {}

  async execute(command: RemoveMessageCommand): Promise<MessageEntity> {
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

    let deletedMessage;
    try {
      await this.messageRepository.delete({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _id: command.messageId,
        _subscriberId: command.subscriberId,
      });
      const item = await this.messageRepository.findDeleted({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _id: command.messageId,
      });

      deletedMessage = item[0];

      if (!deletedMessage.read) {
        await this.updateServices(command, subscriber, deletedMessage, MarkEnum.READ);
      }
      if (!deletedMessage.seen) {
        await this.updateServices(command, subscriber, deletedMessage, MarkEnum.SEEN);
      }
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }

    return deletedMessage;
  }

  private async updateServices(command: RemoveMessageCommand, subscriber, message, marked: MarkEnum) {
    const admin = await this.memberRepository.getOrganizationAdminAccount(command.organizationId);

    this.updateSocketCount(subscriber, marked);

    if (admin) {
      this.analyticsService.track(`Removed Message - [Notification Center]`, admin._userId, {
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
}
