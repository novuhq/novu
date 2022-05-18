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

    if (command.channel != null) {
      if (command.channel.integrationId != null) {
        updatePayload['channel.integrationId'] = command.channel.integrationId;
      }

      if (command.channel.credentials != null) {
        if (command.channel.credentials.channelId != null) {
          updatePayload['channel.credentials.channelId'] = command.channel.credentials.channelId;
        }

        if (command.channel.credentials.accessToken != null) {
          updatePayload['channel.credentials.accessToken'] = command.channel.credentials.accessToken;
        }
      }
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
