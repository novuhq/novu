import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ChannelEndpointRepository, SubscriberRepository } from '@novu/dal';
import { SubscriberResponseDto } from '../../../subscribers/dtos';
import { DeleteChannelEndpointCommand } from './delete-channel-endpoint.command';

@Injectable()
export class DeleteChannelEndpoint {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly subscriberRepository: SubscriberRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: DeleteChannelEndpointCommand): Promise<void> {
    const subscriber = await this.validateSubscriberExists(command);
    const channelEndpoint = await this.fetchChannelEndpoint(command, subscriber);

    if (!channelEndpoint) {
      throw new NotFoundException(`Channel endpoint with identifier '${command.identifier}' not found`);
    }

    await this.channelEndpointRepository.delete({
      _id: channelEndpoint._id,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });
  }

  private async validateSubscriberExists(command: DeleteChannelEndpointCommand): Promise<SubscriberResponseDto> {
    const subscriber = await this.subscriberRepository.findOne({
      subscriberId: command.subscriberId,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!subscriber) {
      throw new NotFoundException(`Subscriber with id '${command.subscriberId}' not found`);
    }

    return subscriber;
  }

  private async fetchChannelEndpoint(command: DeleteChannelEndpointCommand, subscriber: SubscriberResponseDto) {
    return await this.channelEndpointRepository.findOne({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      subscriberId: subscriber.subscriberId,
      identifier: command.identifier,
    });
  }
}
