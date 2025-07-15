import { Injectable, BadRequestException } from '@nestjs/common';
import {
  AnalyticsService,
  buildFeedKey,
  buildMessageCountKey,
  InvalidateCacheService,
  WebSocketsQueueService,
} from '@novu/application-generic';
import { MessageRepository } from '@novu/dal';
import { WebSocketEventEnum } from '@novu/shared';

import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import { AnalyticsEventsEnum } from '../../utils';
import { MarkNotificationsAsSeenCommand } from './mark-notifications-as-seen.command';
import { validateDataStructure } from '../../utils/validate-data';

@Injectable()
export class MarkNotificationsAsSeen {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private getSubscriber: GetSubscriber,
    private analyticsService: AnalyticsService,
    private messageRepository: MessageRepository,
    private webSocketsQueueService: WebSocketsQueueService
  ) {}

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

    // If notificationIds are provided, use them; otherwise use filters
    if (notificationIds && notificationIds.length > 0) {
      await this.messageRepository.updateMessagesStatusByIds({
        environmentId: command.environmentId,
        subscriberId: subscriber._id,
        ids: notificationIds,
        seen: true,
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
}
