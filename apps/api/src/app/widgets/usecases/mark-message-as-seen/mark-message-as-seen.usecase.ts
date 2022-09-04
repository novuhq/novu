import { Inject, Injectable } from '@nestjs/common';
import { MessageEntity, MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';
import { QueueService } from '../../../shared/services/queue';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { MarkMessageAsSeenCommand } from './mark-message-as-seen.command';

@Injectable()
export class MarkMessageAsSeen {
  constructor(
    private messageRepository: MessageRepository,
    private queueService: QueueService,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: MarkMessageAsSeenCommand): Promise<MessageEntity> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    await this.messageRepository.changeSeenStatus(subscriber._id, command.messageId, true);

    const count = await this.messageRepository.getUnseenCount(
      command.environmentId,
      subscriber._id,
      ChannelTypeEnum.IN_APP
    );

    this.queueService.wsSocketQueue.add({
      event: 'unseen_count_changed',
      userId: subscriber._id,
      payload: {
        unseenCount: count,
      },
    });

    const message = await this.messageRepository.findById(command.messageId);

    this.analyticsService.track('Mark as Seen - [Notification Center]', command.organizationId, {
      _subscriber: message._subscriberId,
      _organization: command.organizationId,
      _template: message._templateId,
    });

    return message;
  }
}
