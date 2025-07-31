import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  buildFeedKey,
  buildMessageCountKey,
  InvalidateCacheService,
  WebSocketsQueueService,
} from '@novu/application-generic';
import { DalException, MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum, WebSocketEventEnum } from '@novu/shared';

import { MarkEnum } from '../mark-message-as/mark-message-as.command';
import { RemoveMessagesBulkCommand } from './remove-messages-bulk.command';

@Injectable()
export class RemoveMessagesBulk {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private messageRepository: MessageRepository,
    private webSocketsQueueService: WebSocketsQueueService,
    private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: RemoveMessagesBulkCommand): Promise<void> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) throw new NotFoundException(`Subscriber ${command.subscriberId} not found`);

    try {
      const deletedMessages = await this.messageRepository.delete({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: subscriber._id,
        channel: ChannelTypeEnum.IN_APP,
        _id: { $in: command.messageIds },
      });

      if (deletedMessages.deletedCount > 0) {
        await Promise.all([
          this.updateServices(subscriber, MarkEnum.SEEN),
          this.updateServices(subscriber, MarkEnum.READ),
          this.invalidateCache.invalidateQuery({
            key: buildFeedKey().invalidate({
              subscriberId: command.subscriberId,
              _environmentId: command.environmentId,
            }),
          }),
          this.invalidateCache.invalidateQuery({
            key: buildMessageCountKey().invalidate({
              subscriberId: command.subscriberId,
              _environmentId: command.environmentId,
            }),
          }),
        ]);
      }
    } catch (e) {
      if (e instanceof DalException) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }

  private async updateServices(subscriber, marked: string): Promise<void> {
    const eventMessage = marked === MarkEnum.READ ? WebSocketEventEnum.UNREAD : WebSocketEventEnum.UNSEEN;

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
