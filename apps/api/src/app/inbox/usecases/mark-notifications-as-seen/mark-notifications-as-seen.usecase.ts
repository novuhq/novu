import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import {
  AnalyticsService,
  buildFeedKey,
  buildMessageCountKey,
  InvalidateCacheService,
  LogRepository,
  mapEventTypeToTitle,
  messageWebhookMapper,
  PinoLogger,
  SendWebhookMessage,
  Trace,
  TraceLogRepository,
  WebSocketsQueueService,
} from '@novu/application-generic';
import { MessageEntity, MessageRepository } from '@novu/dal';
import { WebhookEventEnum, WebhookObjectTypeEnum, WebSocketEventEnum } from '@novu/shared';

import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import { AnalyticsEventsEnum } from '../../utils';
import { validateDataStructure } from '../../utils/validate-data';
import { MarkNotificationsAsSeenCommand } from './mark-notifications-as-seen.command';

@Injectable()
export class MarkNotificationsAsSeen {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private getSubscriber: GetSubscriber,
    private analyticsService: AnalyticsService,
    private messageRepository: MessageRepository,
    private webSocketsQueueService: WebSocketsQueueService,
    private traceLogRepository: TraceLogRepository,
    private logger: PinoLogger,
    private sendWebhookMessage: SendWebhookMessage
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: MarkNotificationsAsSeenCommand): Promise<void> {
    const { notificationIds, tags, data } = command;

    // Return early if notificationIds is an empty array
    if (notificationIds && notificationIds.length === 0) {
      return;
    }

    const subscriber = await this.getSubscriber.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
    });

    if (!subscriber) {
      throw new BadRequestException(`Subscriber with id: ${command.subscriberId} is not found.`);
    }

    let updatedMessages: MessageEntity[] = [];
    // If notificationIds are provided, use them; otherwise use filters
    if (notificationIds && notificationIds.length > 0) {
      updatedMessages = await this.messageRepository.updateMessagesStatusByIds({
        environmentId: command.environmentId,
        subscriberId: subscriber._id,
        ids: notificationIds,
        seen: true,
      });

      const webhookPromises = updatedMessages.map((message) =>
        this.sendWebhookMessage.execute({
          eventType: WebhookEventEnum.MESSAGE_SEEN,
          objectType: WebhookObjectTypeEnum.MESSAGE,
          payload: {
            object: messageWebhookMapper(message, subscriber.subscriberId),
          },
          organizationId: command.organizationId,
          environmentId: command.environmentId,
        })
      );

      await Promise.all(webhookPromises);

      await this.logTraces({
        command,
        subscriberId: subscriber.subscriberId,
        _subscriberId: subscriber._id,
        method: 'by_ids',
      });

      this.analyticsService.track(AnalyticsEventsEnum.MARK_NOTIFICATIONS_AS_SEEN, '', {
        _organization: command.organizationId,
        _subscriberId: subscriber._id,
        method: 'by_ids',
        count: notificationIds.length,
      });
    } else {
      // Use filter-based approach
      let parsedData;
      if (data) {
        try {
          parsedData = JSON.parse(data);
          validateDataStructure(parsedData);
        } catch (error) {
          if (error instanceof BadRequestException) {
            throw error;
          }
          throw new BadRequestException('Invalid JSON format for data parameter');
        }
      }

      const fromFilters: Record<string, unknown> = {};
      if (tags) {
        fromFilters.tags = tags;
      }
      if (parsedData) {
        fromFilters.data = parsedData;
      }

      await this.messageRepository.updateMessagesFromToStatus({
        environmentId: command.environmentId,
        subscriberId: subscriber._id,
        from: fromFilters,
        to: {
          seen: true,
        },
      });

      await this.logTraces({
        command,
        subscriberId: subscriber.subscriberId,
        _subscriberId: subscriber._id,
        method: 'by_filters',
      });

      this.analyticsService.track(AnalyticsEventsEnum.MARK_NOTIFICATIONS_AS_SEEN, '', {
        _organization: command.organizationId,
        _subscriberId: subscriber._id,
        method: 'by_filters',
        filters: fromFilters,
      });
    }

    // Invalidate caches
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

    this.webSocketsQueueService.add({
      name: 'sendMessage',
      data: {
        event: WebSocketEventEnum.UNSEEN,
        userId: subscriber._id,
        _environmentId: command.environmentId,
      },
      groupId: subscriber._organizationId,
    });
  }

  private async logTraces({
    command,
    subscriberId,
    _subscriberId,
    method,
  }: {
    command: MarkNotificationsAsSeenCommand;
    subscriberId: string;
    _subscriberId: string;
    method: 'by_ids' | 'by_filters';
  }): Promise<void> {
    let messages: MessageEntity[] = [];

    if (method === 'by_ids' && command.notificationIds && command.notificationIds.length > 0) {
      messages = await this.messageRepository.find({
        _environmentId: command.environmentId,
        _subscriberId,
        _id: { $in: command.notificationIds },
      });
    } else if (method === 'by_filters') {
      // For filter-based approach, we need to fetch messages that match the filters
      const fromFilters: Record<string, unknown> = {};
      if (command.tags) {
        fromFilters.tags = command.tags;
      }
      if (command.data) {
        try {
          const parsedData = JSON.parse(command.data);
          fromFilters.data = parsedData;
        } catch (error) {
          // If data parsing fails, skip trace logging for this case
          return;
        }
      }

      messages = await this.messageRepository.find({
        _environmentId: command.environmentId,
        _subscriberId,
        ...fromFilters,
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return;
    }

    const allTraceData: Omit<Trace, 'id' | 'expires_at'>[] = [];

    for (const message of messages) {
      if (!message._jobId) continue;

      allTraceData.push(
        this.createTraceLog({
          message,
          command,
          subscriberId,
          _subscriberId,
        })
      );
    }

    if (allTraceData.length > 0) {
      try {
        await this.traceLogRepository.createMany(allTraceData);
      } catch (error) {
        this.logger.warn({ err: error }, `Failed to create seen traces for ${allTraceData.length} messages`);
      }
    }
  }

  private createTraceLog({
    message,
    command,
    subscriberId,
    _subscriberId,
  }: {
    message: MessageEntity;
    command: MarkNotificationsAsSeenCommand;
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
      event_type: 'message_seen',
      title: mapEventTypeToTitle('message_seen'),
      message: `Message seen for subscriber ${message._subscriberId}`,
      raw_data: null,
      status: 'success',
      entity_type: 'step_run',
      entity_id: message._jobId,
    };
  }
}
