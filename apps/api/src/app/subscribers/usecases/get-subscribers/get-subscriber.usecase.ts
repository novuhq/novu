import { Injectable } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { GetSubscribersCommand } from './get-subscriber.command';

@Injectable()
export class GetSubscribers {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: GetSubscribersCommand) {
    return this.subscriberRepository.find({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
  }
}
