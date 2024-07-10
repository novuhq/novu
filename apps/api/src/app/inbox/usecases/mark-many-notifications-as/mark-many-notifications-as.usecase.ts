import { Injectable } from '@nestjs/common';
import {
  buildFeedKey,
  buildMessageCountKey,
  InvalidateCacheService,
  WebSocketsQueueService,
} from '@novu/application-generic';
import { MessageRepository } from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import { MarkManyNotificationsAsCommand } from './mark-many-notifications-as.command';

@Injectable()
export class MarkManyNotificationsAs {
  constructor(
    private invalidateCacheService: InvalidateCacheService,
    private webSocketsQueueService: WebSocketsQueueService,
    private getSubscriber: GetSubscriber,
    private messageRepository: MessageRepository
  ) {}

  async execute(command: MarkManyNotificationsAsCommand): Promise<void> {
    const subscriber = await this.getSubscriber.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
    });
    if (!subscriber) {
      throw new ApiException(`Subscriber with id: ${command.subscriberId} is not found.`);
    }

    await this.messageRepository.updateMessagesStatusByIds({
      environmentId: command.environmentId,
      subscriberId: subscriber._id,
      ids: command.ids,
      read: command.read,
      archived: command.archived,
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
}
