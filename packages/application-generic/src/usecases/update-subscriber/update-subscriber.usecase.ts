import { Injectable } from '@nestjs/common';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';

import {
  InvalidateCacheService,
  buildSubscriberKey,
} from '../../services/cache';
import { subscriberNeedUpdate } from '../../utils/subscriber';

import { UpdateSubscriberCommand } from './update-subscriber.command';
import { ApiException } from '../../utils/exceptions';

@Injectable()
export class UpdateSubscriber {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private subscriberRepository: SubscriberRepository
  ) {}

  public async execute(
    command: UpdateSubscriberCommand
  ): Promise<SubscriberEntity> {
    const foundSubscriber = command.subscriber
      ? command.subscriber
      : await this.subscriberRepository.findBySubscriberId(
          command.environmentId,
          command.subscriberId
        );

    if (!foundSubscriber) {
      throw new ApiException(`SubscriberId: ${command.subscriberId} not found`);
    }

    const updatePayload: Partial<SubscriberEntity> = {};

    if (command.email !== undefined) {
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

    if (command.locale != null) {
      updatePayload.locale = command.locale;
    }

    if (command.data != null) {
      updatePayload.data = command.data;
    }

    if (!subscriberNeedUpdate(foundSubscriber, updatePayload)) {
      return {
        ...foundSubscriber,
      };
    }

    await this.invalidateCache.invalidateByKey({
      key: buildSubscriberKey({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    await this.subscriberRepository.update(
      {
        _environmentId: command.environmentId,
        _id: foundSubscriber._id,
      },
      {
        $set: updatePayload,
      }
    );

    return {
      ...foundSubscriber,
      ...updatePayload,
    };
  }
}
