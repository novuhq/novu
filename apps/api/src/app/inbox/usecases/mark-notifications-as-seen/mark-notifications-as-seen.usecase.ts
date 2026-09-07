import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AnalyticsService,
  buildMessageCountKey,
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
import {
  DeliveryLifecycleStatusEnum,
  normalizeTagGroups,
  WebhookEventEnum,
  WebhookObjectTypeEnum,
  WebSocketEventEnum,
} from '@novu/shared';

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
    private messageInteractionService: MessageInteractionService,
    private logger: PinoLogger,
    private sendWebhookMessage: SendWebhookMessage,
    private environmentRepository: EnvironmentRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: MarkNotificationsAsSeenCommand): Promise<void> {
    const { notificationIds, tags, data, contextKeys } = command;

    // Return early if notificationIds is an empty array
    if (notificationIds && notificationIds.length === 0) {
      return;
    }

    const subscriber = await this.getSubscriber.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
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

    if (!subscriber) {
      throw new BadRequestException(`Subscriber with id: ${command.subscriberId} is not found.`);
    }

    const updatedMessages: MessageEntity[] = [];
    // If notificationIds are provided, use them; otherwise use filters
    if (notificationIds && notificationIds.length > 0) {
      const BATCH_SIZE = 50;
      const notificationIdChunks = this.chunkArray(notificationIds, BATCH_SIZE);

      for (const idChunk of notificationIdChunks) {
        const batchResults = await this.messageRepository.updateMessagesStatusByIds({
          environmentId: command.environmentId,
          subscriberId: subscriber._id,
          contextKeys,
          ids: idChunk,
          seen: true,
        });
        updatedMessages.push(...batchResults);
      }

      this.processWebhooksInBatches(updatedMessages, command, subscriber.subscriberId, environment);

      await this.logTraces({
        messages: updatedMessages,
        command,
        subscriberId: subscriber.subscriberId,
        _subscriberId: subscriber._id,
      });

      this.analyticsService.track(AnalyticsEventsEnum.MARK_NOTIFICATIONS_AS_SEEN, '', {
        _organization: command.organizationId,
        _subscriberId: subscriber._id,
        method: 'by_ids',
        count: notificationIds.length,
      });
    } else {
      // Use filter-based approach
      let parsedData: unknown;
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
        fromFilters.tagGroups = normalizeTagGroups(tags);
      }
      if (parsedData) {
        fromFilters.data = parsedData;
      }

      const updatedMessages = await this.messageRepository.updateMessagesFromToStatus({
        environmentId: command.environmentId,
        subscriberId: subscriber._id,
        contextKeys,
        from: fromFilters,
        to: {
          seen: true,
        },
      });

      await this.logTraces({
        messages: updatedMessages,
        command,
        subscriberId: subscriber.subscriberId,
        _subscriberId: subscriber._id,
      });

      this.analyticsService.track(AnalyticsEventsEnum.MARK_NOTIFICATIONS_AS_SEEN, '', {
        _organization: command.organizationId,
        _subscriberId: subscriber._id,
        method: 'by_filters',
        filters: fromFilters,
      });
    }

    await Promise.all([
      this.invalidateCache.invalidateQuery({
        key: buildMessageCountKey().invalidate({
          subscriberId: command.subscriberId,
          _environmentId: command.environmentId,
        }),
      }),
    ]);

    this.webSocketsQueueService.add({
      name: 'sendMessage',
      data: {
        event: WebSocketEventEnum.UNSEEN,
        userId: subscriber._id,
        _environmentId: command.environmentId,
        contextKeys: contextKeys ?? [],
      },
      groupId: subscriber._organizationId,
    });
  }

  private async processWebhooksInBatches(
    messages: MessageEntity[],
    command: MarkNotificationsAsSeenCommand,
    subscriberId: string,
    environment: EnvironmentEntity
  ): Promise<void> {
    const BATCH_SIZE = 100;
    const messageChunks = this.chunkArray(messages, BATCH_SIZE);

    for (const messageChunk of messageChunks) {
      const webhookPromises = messageChunk.map((message) =>
        this.sendWebhookMessage.execute({
          eventType: WebhookEventEnum.MESSAGE_SEEN,
          objectType: WebhookObjectTypeEnum.MESSAGE,
          payload: {
            object: messageWebhookMapper(message, subscriberId),
          },
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          environment,
        })
      );

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

  private async logTraces({
    messages,
    command,
    subscriberId,
    _subscriberId,
  }: {
    messages: MessageEntity[];
    command: MarkNotificationsAsSeenCommand;
    subscriberId: string;
    _subscriberId: string;
  }): Promise<void> {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return;
    }

    const allTraceData: MessageInteractionTrace[] = [];

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
        await this.messageInteractionService.trace(allTraceData, DeliveryLifecycleStatusEnum.INTERACTED);
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
  }): MessageInteractionTrace {
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
}
