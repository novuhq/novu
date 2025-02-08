import { Injectable } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { BulkCreateSubscribersCommand } from './bulk-create-subscribers.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { BulkCreateSubscriberResponseDto } from '../../dtos/bulk-create-subscriber-response.dto';

@Injectable()
export class BulkCreateSubscribers {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: BulkCreateSubscribersCommand): Promise<BulkCreateSubscriberResponseDto> {
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
