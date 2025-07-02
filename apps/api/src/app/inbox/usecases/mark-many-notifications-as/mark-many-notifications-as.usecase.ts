import { Injectable, BadRequestException } from '@nestjs/common';
import {
  buildFeedKey,
  buildMessageCountKey,
  InvalidateCacheService,
  WebSocketsQueueService,
  TraceLogService,
  PinoLogger,
} from '@novu/application-generic';
import { MessageRepository } from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';

import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import { MarkManyNotificationsAsCommand } from './mark-many-notifications-as.command';

@Injectable()
export class MarkManyNotificationsAs {
  constructor(
    private invalidateCacheService: InvalidateCacheService,
    private webSocketsQueueService: WebSocketsQueueService,
    private getSubscriber: GetSubscriber,
    private messageRepository: MessageRepository,
    private traceLogService: TraceLogService,
    private logger: PinoLogger
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

    await this.messageRepository.updateMessagesStatusByIds({
      environmentId: command.environmentId,
      subscriberId: subscriber._id,
      ids: command.ids,
      read: command.read,
      archived: command.archived,
      snoozedUntil: command.snoozedUntil,
    });

    await this.logTraces(command, subscriber._id);

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

  private async logTraces(command: MarkManyNotificationsAsCommand, _subscriberId: string): Promise<void> {
    const messages = await this.messageRepository.find({
      _environmentId: command.environmentId,
      _subscriberId,
      _id: { $in: command.ids },
    });

    for (const message of messages) {
      try {
        if (!message._jobId) continue;

        if (command.read !== undefined) {
          await this.traceLogService.run(
            message,
            command.read ? 'message_read' : 'message_unread',
            command.subscriberId
          );
        }

        if (command.snoozedUntil !== undefined) {
          await this.traceLogService.run(message, 'message_snoozed', command.subscriberId);
        }

        if (command.archived !== undefined) {
          await this.traceLogService.run(
            message,
            command.archived ? 'message_archived' : 'message_unarchived',
            command.subscriberId
          );
        }
      } catch (error) {
        this.logger.warn({ err: error }, `Failed to create engagement trace for message ${message._id}`);
      }
    }
  }
}
