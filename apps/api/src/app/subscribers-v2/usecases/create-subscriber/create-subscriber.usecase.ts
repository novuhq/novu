import { Injectable, ConflictException } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { slugify } from '@novu/shared';
import { SubscriberResponseDto } from '../../../subscribers/dtos';
import { mapSubscriberEntityToDto } from '../list-subscribers/map-subscriber-entity-to.dto';
import { CreateSubscriberCommand } from './create-subscriber.command';

@Injectable()
export class CreateSubscriber {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: CreateSubscriberCommand): Promise<SubscriberResponseDto> {
    const sanitizedSubcriberId = this.sanitizeSubscriberId(command.createSubscriberRequestDto.subscriberId);
    const existingSubscriber = await this.subscriberRepository.findOne({
      subscriberId: sanitizedSubcriberId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (existingSubscriber) {
      throw new ConflictException(`Subscriber: ${sanitizedSubcriberId} already exists`);
    }

    const createdSubscriber = await this.subscriberRepository.create({
      ...command.createSubscriberRequestDto,
      subscriberId: sanitizedSubcriberId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    return mapSubscriberEntityToDto(createdSubscriber);
  }

  private sanitizeSubscriberId(subscriberId: string): string {
    return slugify(subscriberId, {
      lowercase: false,
    });
  }
}
