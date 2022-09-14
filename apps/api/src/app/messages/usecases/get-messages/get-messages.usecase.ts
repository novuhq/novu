import { Injectable } from '@nestjs/common';
import { MessageEntity, MessageRepository, SubscriberRepository } from '@novu/dal';
import { GetMessagesCommand } from './get-messages.command';

@Injectable()
export class GetMessages {
  constructor(private messageRepository: MessageRepository, private subscriberRepository: SubscriberRepository) {}

  async execute(command: GetMessagesCommand) {
    const LIMIT = 10;

    const query: Partial<MessageEntity> = {
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    };

    if (command.subscriberId) {
      const subscriber = await this.subscriberRepository.findBySubscriberId(
        command.environmentId,
        command.subscriberId
      );

      if (subscriber) {
        query._subscriberId = subscriber._id;
      }
    }

    if (command.channel) {
      query.channel = command.channel;
    }

    const totalCount = await this.messageRepository.count(query);

    const data = await this.messageRepository.find(query, '', {
      limit: LIMIT,
      skip: command.page * LIMIT,
    });

    return {
      page: command.page,
      totalCount,
      pageSize: LIMIT,
      data,
    };
  }
}
