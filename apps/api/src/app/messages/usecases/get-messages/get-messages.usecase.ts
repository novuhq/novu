import { BadRequestException, Injectable } from '@nestjs/common';
import { MessageEntity, MessageRepository, SubscriberRepository } from '@novu/dal';
import { GetMessagesCommand } from './get-messages.command';

@Injectable()
export class GetMessages {
  constructor(private messageRepository: MessageRepository, private subscriberRepository: SubscriberRepository) {}

  async execute(command: GetMessagesCommand) {
    const LIMIT = command.limit;

    if (LIMIT > 1000) {
      throw new BadRequestException('Limit can not be larger then 1000');
    }

    const query: Partial<MessageEntity> & { _environmentId: string } = {
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

    const data = await this.messageRepository.find(query as MessageEntity, '', {
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
