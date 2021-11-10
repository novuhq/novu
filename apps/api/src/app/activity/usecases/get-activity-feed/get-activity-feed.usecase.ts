import { Injectable } from '@nestjs/common';
import {
  MessageEntity,
  MessageRepository,
  NotificationEntity,
  NotificationRepository,
  SubscriberRepository,
} from '@notifire/dal';
import { GetActivityFeedCommand } from './get-activity-feed.command';

@Injectable()
export class GetActivityFeed {
  constructor(
    private notificationRepository: NotificationRepository,
    private messageRepository: MessageRepository,
    private subscribersRepository: SubscriberRepository
  ) {}

  async execute(
    command: GetActivityFeedCommand
  ): Promise<{ totalCount: number; data: MessageEntity[]; pageSize: number; page: number }> {
    const LIMIT = 10;

    let subscriberId: string;
    if (command.search) {
      const foundSubscriber = await this.subscribersRepository.searchSubscriber(command.applicationId, command.search);
      subscriberId = foundSubscriber?._id;

      if (!subscriberId) {
        return {
          page: 0,
          totalCount: 0,
          pageSize: LIMIT,
          data: [],
        };
      }
    }

    const { data: messages, totalCount } = await this.messageRepository.getFeed(
      command.applicationId,
      { channels: command.channels, templates: command.templates, subscriberId },
      command.page * LIMIT,
      LIMIT
    );

    return {
      page: command.page,
      totalCount,
      pageSize: LIMIT,
      data: messages,
    };
  }
}
