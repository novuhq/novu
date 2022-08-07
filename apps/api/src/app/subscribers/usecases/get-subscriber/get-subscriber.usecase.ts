import { Injectable } from '@nestjs/common';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { GetSubscriberCommand } from './get-subscriber.command';

@Injectable()
export class GetSubscriber {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: GetSubscriberCommand): Promise<SubscriberEntity> {
    return await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
  }
}
