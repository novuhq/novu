import { Injectable } from '@nestjs/common';
import { SubscriberEntity, SubscriberRepository } from '@notifire/dal';
import { UpdateSubscriberCommand } from './update-subscriber.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class UpdateSubscriber {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: UpdateSubscriberCommand) {
    const foundSubscriber = await this.subscriberRepository.findBySubscriberId(
      command.applicationId,
      command.subscriberId
    );

    if (!foundSubscriber) {
      throw new ApiException(`SubscriberId: ${command.subscriberId} not found`);
    }

    const updatePayload: Partial<SubscriberEntity> = {};
    if (command.email != null) {
      updatePayload.email = command.email;
    }

    if (command.firstName != null) {
      updatePayload.firstName = command.firstName;
    }

    if (command.lastName != null) {
      updatePayload.lastName = command.lastName;
    }

    await this.subscriberRepository.update(
      {
        _id: foundSubscriber,
      },
      { $set: updatePayload }
    );

    return {
      ...foundSubscriber,
      ...updatePayload,
    };
  }
}
