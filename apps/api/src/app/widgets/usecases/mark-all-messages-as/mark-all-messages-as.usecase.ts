import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import { AnalyticsService } from '@novu/application-generic';

import { InvalidateCacheService } from '../../../shared/services/cache';
import { QueueService } from '../../../shared/services/queue';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { MarkAllMessagesAsCommand } from './mark-all-messages-as.command';
import { buildFeedKey, buildMessageCountKey } from '../../../shared/services/cache/key-builders/queries';

@Injectable()
export class MarkAllMessagesAs {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private messageRepository: MessageRepository,
    private queueService: QueueService,
    private subscriberRepository: SubscriberRepository,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  async execute(command: MarkAllMessagesAsCommand): Promise<number> {
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
    if (!subscriber) {
      throw new NotFoundException(
        `Subscriber ${command.subscriberId} does not exist in environment ${command.environmentId}, ` +
          `please provide a valid subscriber identifier`
      );
    }

    const response = await this.messageRepository.markAllMessagesAs(
      subscriber._id,
      command.environmentId,
      command.markAs,
      command.feedIds
    );

    this.queueService.bullMqService.add(
      'sendMessage',
      {
        event: 'unseen_count_changed',
        userId: subscriber._id,
        payload: {
          unseenCount: 0,
        },
      },
      {},
      subscriber._organizationId
    );

    if (command.markAs === 'read') {
      await this.queueService.bullMqService.add(
        'sendMessage',
        {
          event: 'unread_count_changed',
          userId: subscriber._id,
          payload: {
            unreadCount: 0,
          },
        },
        {},
        subscriber._organizationId
      );
    }

    this.analyticsService.track(
      `Mark all messages as ${command.markAs}- [Notification Center]`,
      command.organizationId,
      {
        _organization: command.organizationId,
        _subscriberId: subscriber._id,
        feedIds: command.feedIds,
        markAs: command.markAs,
      }
    );

    return response.modified;
  }
}
