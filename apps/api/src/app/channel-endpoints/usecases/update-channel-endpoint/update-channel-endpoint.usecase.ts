import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, validateEndpointForType } from '@novu/application-generic';
import { ChannelEndpointEntity, ChannelEndpointRepository } from '@novu/dal';
import { UpdateChannelEndpointCommand } from './update-channel-endpoint.command';

@Injectable()
export class UpdateChannelEndpoint {
  constructor(private readonly channelEndpointRepository: ChannelEndpointRepository) {}

  @InstrumentUsecase()
  async execute(command: UpdateChannelEndpointCommand): Promise<ChannelEndpointEntity> {
    // Check if the channel endpoint exists
    const existingChannelEndpoint = await this.channelEndpointRepository.findOne({
      identifier: command.identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!existingChannelEndpoint) {
      throw new NotFoundException(
        `Channel endpoint with identifier "${command.identifier}" not found in environment "${command.environmentId}"`
      );
    }

    // Validate that the new endpoint matches the existing type
    validateEndpointForType(existingChannelEndpoint.type, command.endpoint);

    const updatedChannelEndpoint = await this.updateChannelEndpoint(command);

    return updatedChannelEndpoint;
  }

  private async updateChannelEndpoint(command: UpdateChannelEndpointCommand): Promise<ChannelEndpointEntity> {
    const channelEndpoint = await this.channelEndpointRepository.findOneAndUpdate(
      {
        identifier: command.identifier,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
      },
      {
        endpoint: command.endpoint,
      },
      {
        new: true,
      }
    );

    if (!channelEndpoint) {
      throw new NotFoundException(`Channel endpoint with identifier "${command.identifier}" not found`);
    }

    return channelEndpoint;
  }
}
