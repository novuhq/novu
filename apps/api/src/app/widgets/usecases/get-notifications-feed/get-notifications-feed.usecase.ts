import { Injectable } from '@nestjs/common';
import { MessageEntity, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { GetNotificationsFeedCommand } from './get-notifications-feed.command';

@Injectable()
export class GetNotificationsFeed {
  constructor(private messageRepository: MessageRepository) {}

  async execute(command: GetNotificationsFeedCommand): Promise<MessageEntity[]> {
    const result = await this.messageRepository.findBySubscriberChannel(
      command.environmentId,
      command.subscriberId,
      ChannelTypeEnum.IN_APP,
      command.feedId,
      {
        limit: 10,
        skip: command.page * 10,
      }
    );

    return result;
  }
}
