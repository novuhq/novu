import { Inject, Injectable } from '@nestjs/common';
import { MessageRepository } from '@novu/dal';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';
import { CacheKeyPrefixEnum } from '../../../shared/services/cache';
import { QueueService } from '../../../shared/services/queue';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { MarkAllMessageAsSeenCommand } from './mark-all-message-as-seen.command';
import { InvalidateCache } from '../../../shared/interceptors';

@Injectable()
export class MarkAllMessageAsSeen {
  constructor(
    private messageRepository: MessageRepository,
    private queueService: QueueService,

    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  @InvalidateCache([CacheKeyPrefixEnum.MESSAGE_COUNT, CacheKeyPrefixEnum.FEED])
  async execute(command: MarkAllMessageAsSeenCommand): Promise<number> {
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
