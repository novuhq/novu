import { Inject, Injectable } from '@nestjs/common';
import { MessageEntity, MessageRepository, SubscriberRepository, SubscriberEntity } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';
import { QueueService } from '../../../shared/services/queue';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { MarkEnum, MarkMessageAsCommand } from './mark-message-as.command';

@Injectable()
export class MarkMessageAs {
  constructor(
    private messageRepository: MessageRepository,
    private queueService: QueueService,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: MarkMessageAsCommand): Promise<MessageEntity[]> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    await this.messageRepository.changeStatus(command.environmentId, subscriber._id, command.messageIds, command.mark);

    const messages = await this.messageRepository.find({
      _environmentId: command.environmentId,
      _subscriberId: subscriber._id,
      _id: {
        $in: command.messageIds,
      },
    });

    if (command.mark.seen != null) {
      await this.updateServices(command, subscriber, messages, MarkEnum.SEEN);
    }

    if (command.mark.read != null) {
      await this.updateServices(command, subscriber, messages, MarkEnum.READ);
    }

    return messages;
  }

  private async updateServices(command: MarkMessageAsCommand, subscriber, messages, marked: string) {
    const count = await this.messageRepository.getCount(command.environmentId, subscriber._id, ChannelTypeEnum.IN_APP, {
      [marked]: false,
    });

    this.updateSocketCount(subscriber, count, marked);

    for (const message of messages) {
      this.analyticsService.track(`Mark as ${marked} - [Notification Center]`, command.organizationId, {
        _subscriber: message._subscriberId,
        _organization: command.organizationId,
        _template: message._templateId,
      });
    }
  }

  private updateSocketCount(subscriber: SubscriberEntity, count: number, mark: string) {
    const eventMessage = `un${mark}_count_changed`;
    const countKey = `un${mark}Count`;

    this.queueService.wsSocketQueue.add({
      event: eventMessage,
      userId: subscriber._id,
      payload: {
        [countKey]: count,
      },
    });
  }
}
