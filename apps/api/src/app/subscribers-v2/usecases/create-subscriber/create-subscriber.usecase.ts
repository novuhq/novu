import { ConflictException, Injectable } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { CreateOrUpdateSubscriberUseCase } from '@novu/application-generic';
import { SubscriberResponseDto } from '../../../subscribers/dtos';
import { mapSubscriberEntityToDto } from '../list-subscribers/map-subscriber-entity-to.dto';
import { CreateSubscriberCommand } from './create-subscriber.command';
import { mapSubscriberRequestToCommand } from '../../utils/create-subscriber.mapper';

@Injectable()
export class CreateSubscriber {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private createOrUpdateSubscriberUsecase: CreateOrUpdateSubscriberUseCase
  ) {}

  async execute(command: CreateSubscriberCommand): Promise<SubscriberResponseDto> {
    const { subscriberId } = command.createSubscriberRequestDto;
    const existingSubscriber = await this.subscriberRepository.findOne({
      subscriberId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (existingSubscriber) {
      throw new ConflictException(`Subscriber: ${subscriberId} already exists`);
    }
    const subscriberEntity = await this.createOrUpdateSubscriberUsecase.execute(mapSubscriberRequestToCommand(command));

    return mapSubscriberEntityToDto(subscriberEntity);
  }
}
