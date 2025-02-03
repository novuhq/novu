import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { PatchSubscriberCommand } from './patch-subscriber.command';
import { mapSubscriberEntityToDto } from '../list-subscribers/map-subscriber-entity-to.dto';
import { SubscriberResponseDto } from '../../../subscribers/dtos';

@Injectable()
export class PatchSubscriber {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: PatchSubscriberCommand): Promise<SubscriberResponseDto> {
    const nonUndefinedEntries = Object.entries(command.patchSubscriberRequestDto).filter(
      ([_key, value]) => value !== undefined
    );
    const payload: Partial<SubscriberEntity> = Object.fromEntries(nonUndefinedEntries);

    const updatedSubscriber = await this.subscriberRepository.findOneAndUpdate(
      {
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      { ...payload },
      {
        new: true,
        projection: {
          _environmentId: 1,
          _id: 1,
          _organizationId: 1,
          avatar: 1,
          data: 1,
          email: 1,
          firstName: 1,
          lastName: 1,
          locale: 1,
          phone: 1,
          subscriberId: 1,
          timezone: 1,
          createdAt: 1,
          updatedAt: 1,
          deleted: 1,
        },
      }
    );

    if (!updatedSubscriber) {
      throw new NotFoundException(`Subscriber: ${command.subscriberId} was not found`);
    }

    return mapSubscriberEntityToDto(updatedSubscriber);
  }
}
