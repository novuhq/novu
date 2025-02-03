import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { GetSubscriberCommand } from './get-subscriber.command';
import { mapSubscriberEntityToDto } from '../list-subscribers/map-subscriber-entity-to.dto';
import { SubscriberResponseDto } from '../../../subscribers/dtos';

@Injectable()
export class GetSubscriber {
  constructor(private subscriberRepository: SubscriberRepository) {}

  async execute(command: GetSubscriberCommand): Promise<SubscriberResponseDto> {
    const subscriber = await this.fetchSubscriber({
      _environmentId: command.environmentId,
      subscriberId: command.subscriberId,
      _organizationId: command.organizationId,
    });

    if (!subscriber) {
      throw new NotFoundException(`Subscriber: ${command.subscriberId} was not found`);
    }

    return mapSubscriberEntityToDto(subscriber);
  }

  private async fetchSubscriber({
    subscriberId,
    _environmentId,
    _organizationId,
  }: {
    subscriberId: string;
    _environmentId: string;
    _organizationId: string;
  }): Promise<SubscriberEntity | null> {
    return await this.subscriberRepository.findOne({ _environmentId, subscriberId, _organizationId });
  }
}
