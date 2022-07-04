import { Injectable } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { GetSubscribersCommand } from './get-subscriber.command';

@Injectable()
export class GetSubscribers {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: GetSubscribersCommand) {
    const LIMIT = 10;

    const query = {
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    };

    const totalCount = await this.subscriberRepository.count(query);

    const data = await this.subscriberRepository.find(query, '', {
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
