import { Inject, Injectable } from '@nestjs/common';
import { MessageRepository } from '@novu/dal';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';
import { CacheService, invalidateCache } from '../../../shared/services/cache';
import { QueueService } from '../../../shared/services/queue';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { MarkAllMessageAsSeenCommand } from './mark-all-message-as-seen.command';

@Injectable()
export class MarkAllMessageAsSeen {
  constructor(
    private messageRepository: MessageRepository,
    private queueService: QueueService,
    private cacheService: CacheService,

    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  async execute(command: MarkAllMessageAsSeenCommand): Promise<number> {
    invalidateCache({
      service: this.cacheService,
      storeKeyPrefix: ['message-count', 'feed'],
      credentials: {
        subscriberId: command.subscriberId,
        environmentId: command.environmentId,
      },
    });

    const response = await this.messageRepository.markAllUnseenAsSeen(command._subscriberId, command.environmentId);

    this.queueService.wsSocketQueue.add({
      event: 'unseen_count_changed',
      userId: command._subscriberId,
      payload: {
        unseenCount: 0,
      },
    });

    this.analyticsService.track('Mark all message as seen - [Notification Center]', command.organizationId, {
      _organization: command.organizationId,
    });

    return response.modified;
  }
}
