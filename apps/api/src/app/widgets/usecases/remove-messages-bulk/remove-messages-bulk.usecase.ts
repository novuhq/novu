import { Injectable, NotFoundException } from '@nestjs/common';
import { DalException, MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum, WebSocketEventEnum } from '@novu/shared';
import {
  WebSocketsQueueService,
  AnalyticsService,
  InvalidateCacheService,
  buildFeedKey,
  buildMessageCountKey,
} from '@novu/application-generic';

import { ApiException } from '../../../shared/exceptions/api.exception';
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
      await this.messageRepository.deleteMany({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: subscriber._id,
        channel: ChannelTypeEnum.IN_APP,
        _id: { $in: command.messageIds },
      });

      await this.updateServices(subscriber, MarkEnum.SEEN);
      await this.updateServices(subscriber, MarkEnum.READ);

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
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }
  }

  private async updateServices(subscriber, marked: string) {
    const eventMessage = marked === MarkEnum.READ ? WebSocketEventEnum.UNREAD : WebSocketEventEnum.UNSEEN;

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
