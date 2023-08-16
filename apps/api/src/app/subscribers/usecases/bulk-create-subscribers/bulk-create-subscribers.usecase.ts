import { Injectable } from '@nestjs/common';
import { BulkCreateSubscribersCommand } from './bulk-create-subscribers.command';
import { SubscriberRepository } from '@novu/dal';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class BulkCreateSubscribers {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: BulkCreateSubscribersCommand) {
    try {
      return await this.subscriberRepository.bulkCreateSubscribers(
        command.subscribers,
        command.environmentId,
        command.organizationId
      );
    } catch (e) {
      throw new ApiException(e.message);
    }
  }
}
