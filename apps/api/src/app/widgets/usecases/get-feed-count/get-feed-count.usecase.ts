import { Injectable } from '@nestjs/common';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { GetFeedCountCommand } from './get-feed-count.command';

@Injectable()
export class GetFeedCount {
  constructor(private messageRepository: MessageRepository, private subscriberRepository: SubscriberRepository) {}

  async execute(command: GetFeedCountCommand): Promise<{ count: number }> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    const count = await this.messageRepository.getCount(command.environmentId, subscriber._id, ChannelTypeEnum.IN_APP, {
      feedId: command.feedId,
      seen: command.seen,
      read: command.read,
    });

    return { count };
  }
}
