import { Injectable } from '@nestjs/common';
import { MarkAllMessageAsSeenByFeedCommand } from './mark-all-message-as-seen-by-feed.command';

@Injectable()
export class MarkAllMessageAsSeenByFeed {
  constructor(
    private messageRepository: MessageRepository,
    private queueService: QueueService,

    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService
  ) {}

  async execute(command: MarkAllMessageAsSeenByFeedCommand): Promise<string> {
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
