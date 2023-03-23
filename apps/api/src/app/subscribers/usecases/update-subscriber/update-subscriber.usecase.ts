import { Injectable } from '@nestjs/common';
import { isEqual } from 'lodash';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { UpdateSubscriberCommand } from './update-subscriber.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { InvalidateCacheService } from '../../../shared/services/cache';
import { entityBuilder } from '../../../shared/services/cache/keys';

@Injectable()
export class UpdateSubscriber {
  constructor(private invalidateCache: InvalidateCacheService, private subscriberRepository: SubscriberRepository) {}

  async execute(command: UpdateSubscriberCommand) {
    const foundSubscriber = command.subscriber
      ? command.subscriber
      : await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

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
      key: entityBuilder().subscriber({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

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

export function subscriberNeedUpdate(
  subscriber: SubscriberEntity,
  subscriberPayload: Partial<SubscriberEntity>
): boolean {
  return (
    !!(subscriberPayload?.email && subscriber?.email !== subscriberPayload?.email) ||
    !!(subscriberPayload?.firstName && subscriber?.firstName !== subscriberPayload?.firstName) ||
    !!(subscriberPayload?.lastName && subscriber?.lastName !== subscriberPayload?.lastName) ||
    !!(subscriberPayload?.phone && subscriber?.phone !== subscriberPayload?.phone) ||
    !!(subscriberPayload?.avatar && subscriber?.avatar !== subscriberPayload?.avatar) ||
    !!(subscriberPayload?.locale && subscriber?.locale !== subscriberPayload?.locale) ||
    !!(subscriberPayload?.data && !isEqual(subscriber?.data, subscriberPayload?.data))
  );
}
