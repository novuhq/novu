import { Injectable } from '@nestjs/common';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { GetUnseenCountCommand } from './get-unseen-count.command';
import { MarkEnum } from '../mark-message-as/mark-message-as.command';

@Injectable()
export class GetUnseenCount {
  constructor(private messageRepository: MessageRepository, private subscriberRepository: SubscriberRepository) {}

  async execute(command: GetUnseenCountCommand): Promise<{ count: number }> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    const count = await this.messageRepository.getCount(
      MarkEnum.SEEN,
      command.environmentId,
      subscriber._id,
      ChannelTypeEnum.IN_APP,
      { feedId: command.feedId, seen: command.seen }
    );

    return { count };
  }
}
