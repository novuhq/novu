import { Injectable, ConflictException } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { SubscriberResponseDto } from '../../../subscribers/dtos';
import { mapSubscriberEntityToDto } from '../list-subscribers/map-subscriber-entity-to.dto';
import { CreateSubscriberCommand } from './create-subscriber.command';

@Injectable()
export class CreateSubscriber {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: CreateSubscriberCommand): Promise<SubscriberResponseDto> {
    const existingSubscriber = await this.subscriberRepository.findOne({
      subscriberId: command.createSubscriberRequestDto.subscriberId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (existingSubscriber) {
      throw new ConflictException(`Subscriber: ${command.createSubscriberRequestDto.subscriberId} already exists`);
    }

    const createdSubscriber = await this.subscriberRepository.create({
      ...command.createSubscriberRequestDto,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    return mapSubscriberEntityToDto(createdSubscriber);
  }
}
