import { Injectable } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { GetSubscribersCommand } from './get-subscriber.command';

@Injectable()
export class GetSubscribers {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: GetSubscribersCommand) {
    const query = {
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    };

    const totalCount = await this.subscriberRepository.count(query);

    const data = await this.subscriberRepository.find(query, '', {
      limit: command.limit,
      skip: command.page * command.limit,
    });

    return {
      page: command.page,
      totalCount,
      pageSize: command.limit,
      data,
    };
  }
}
