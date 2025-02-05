import { Injectable } from '@nestjs/common';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { SubscriberResponseDto } from '../../../subscribers/dtos';
import { mapSubscriberEntityToDto } from '../list-subscribers/map-subscriber-entity-to.dto';
import { CreateSubscriberCommand } from './create-subscriber.command';

@Injectable()
export class CreateSubscriber {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: CreateSubscriberCommand): Promise<SubscriberResponseDto> {
    const exisitingSubscriber = await this.subscriberRepository.findOne({
      subscriberId: command.createSubscriberRequestDto.subscriberId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (exisitingSubscriber) {
      throw new ApiException(`Subscriber: ${command.createSubscriberRequestDto.subscriberId} already exists`);
    }

    const nonUndefinedEntries = Object.entries(command.createSubscriberRequestDto).filter(
      ([_key, value]) => value !== undefined
    );
    const payload: Partial<SubscriberEntity> = Object.fromEntries(nonUndefinedEntries);

    const createdSubscriber = await this.subscriberRepository.create({
      ...payload,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    return mapSubscriberEntityToDto(createdSubscriber);
  }
}
