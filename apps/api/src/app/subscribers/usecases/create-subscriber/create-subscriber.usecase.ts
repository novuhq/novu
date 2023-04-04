import { Injectable } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { CreateSubscriberCommand } from './create-subscriber.command';
import { UpdateSubscriber, UpdateSubscriberCommand } from '../update-subscriber';

@Injectable()
export class CreateSubscriber {
  constructor(private subscriberRepository: SubscriberRepository, private updateSubscriber: UpdateSubscriber) {}

  async execute(command: CreateSubscriberCommand) {
    let subscriber =
      command.subscriber ??
      (await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId, true));

    if (!subscriber) {
      subscriber = await this.subscriberRepository.create({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        firstName: command.firstName,
        lastName: command.lastName,
        subscriberId: command.subscriberId,
        email: command.email,
        phone: command.phone,
        avatar: command.avatar,
        locale: command.locale,
        data: command.data,
      });
    } else {
      subscriber = await this.updateSubscriber.execute(
        UpdateSubscriberCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          firstName: command.firstName,
          lastName: command.lastName,
          subscriberId: command.subscriberId,
          email: command.email,
          phone: command.phone,
          avatar: command.avatar,
          locale: command.locale,
          data: command.data,
          subscriber,
        })
      );
    }

    return subscriber;
  }
}
