import { BadRequestException, Injectable } from '@nestjs/common';
import {
  buildFeedKey,
  buildMessageCountKey,
  EventType,
  InvalidateCacheService,
  LogRepository,
  mapEventTypeToTitle,
  PinoLogger,
  Trace,
  TraceLogRepository,
  WebSocketsQueueService,
} from '@novu/application-generic';
import { MessageEntity, MessageRepository } from '@novu/dal';
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
    private traceLogRepository: TraceLogRepository,
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

    await this.logTraces({
      command,
      subscriberId: subscriber.subscriberId,
      _subscriberId: subscriber._id,
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

  private async logTraces({
    command,
    subscriberId,
    _subscriberId,
  }: {
    command: MarkManyNotificationsAsCommand;
    subscriberId: string;
    _subscriberId: string;
  }): Promise<void> {
    const messages = await this.messageRepository.find({
      _environmentId: command.environmentId,
      _subscriberId,
      _id: { $in: command.ids },
    });

    if (!messages || !Array.isArray(messages)) {
      return;
    }

    const allTraceData: Omit<Trace, 'id' | 'expires_at'>[] = [];

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
        await this.traceLogRepository.createMany(allTraceData);
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
}): Omit<Trace, 'id' | 'expires_at'> {
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
  };
}
