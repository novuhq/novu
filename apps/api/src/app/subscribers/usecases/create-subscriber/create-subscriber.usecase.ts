import { Injectable } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { CreateSubscriberCommand } from './create-subscriber.command';
import { UpdateSubscriber, UpdateSubscriberCommand } from '../update-subscriber';

@Injectable()
export class CreateSubscriber {
  constructor(private subscriberRepository: SubscriberRepository, private updateSubscriber: UpdateSubscriber) {}

  async execute(command: CreateSubscriberCommand) {
    let subscriber = await this.subscriberRepository.findBySubscriberId(command.applicationId, command.subscriberId);

    if (!subscriber) {
      subscriber = await this.subscriberRepository.create({
        _applicationId: command.applicationId,
        _organizationId: command.organizationId,
        firstName: command.firstName,
        lastName: command.lastName,
        subscriberId: command.subscriberId,
        email: command.email,
        phone: command.phone,
      });
    } else {
      subscriber = await this.updateSubscriber.execute(
        UpdateSubscriberCommand.create({
          applicationId: command.applicationId,
          organizationId: command.organizationId,
          firstName: command.firstName,
          lastName: command.lastName,
          subscriberId: command.subscriberId,
          email: command.email,
          phone: command.phone,
        })
      );
    }

    return subscriber;
  }
}
