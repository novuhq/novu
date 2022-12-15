import { Injectable } from '@nestjs/common';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { UpdateSubscriberCommand } from './update-subscriber.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class UpdateSubscriber {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: UpdateSubscriberCommand) {
    const foundSubscriber = await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      command.subscriberId
    );

    if (!foundSubscriber) {
      throw new ApiException(`SubscriberId: ${command.subscriberId} not found`);
    }

    const updatePayload: Partial<SubscriberEntity> = {};
    if (command.email != null) {
      updatePayload.email = command.email;
    }

    if (command.phone != null) {
      updatePayload.phone = command.phone;
    }

    if (command.firstName != null) {
      updatePayload.firstName = command.firstName;
    }

    if (command.lastName != null) {
      updatePayload.lastName = command.lastName;
    }

    if (command.avatar != null) {
      updatePayload.avatar = command.avatar;
    }

    await this.subscriberRepository.update(
      {
        _environmentId: command.environmentId,
        _id: foundSubscriber._id,
      },
      { $set: updatePayload }
    );

    return {
      ...foundSubscriber,
      ...updatePayload,
    };
  }
}
