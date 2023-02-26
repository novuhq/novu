import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';

import { GetSubscriberCommand } from './get-subscriber.command';

@Injectable()
export class GetSubscriber {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: GetSubscriberCommand): Promise<SubscriberEntity> {
    const { environmentId, subscriberId } = command;
    const subscriber = await this.subscriberRepository.findBySubscriberId(environmentId, subscriberId);
    if (!subscriber) {
      throw new NotFoundException(`Subscriber not found for id ${subscriberId}`);
    }

    return subscriber;
  }
}
