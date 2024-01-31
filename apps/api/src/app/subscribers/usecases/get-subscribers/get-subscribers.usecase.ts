import { Injectable } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { GetSubscribersCommand } from './get-subscribers.command';

@Injectable()
export class GetSubscribers {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: GetSubscribersCommand) {
    const query = {
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    };

    const data = await this.subscriberRepository.find(query, '', {
      limit: command.limit,
      skip: command.page * command.limit,
    });

    return {
      page: command.page,
      hasMore: data?.length === command.limit,
      pageSize: command.limit,
      data,
    };
  }
}
