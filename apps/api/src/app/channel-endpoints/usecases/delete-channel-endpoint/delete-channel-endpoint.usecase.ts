import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ChannelEndpointRepository } from '@novu/dal';
import { DeleteChannelEndpointCommand } from './delete-channel-endpoint.command';

@Injectable()
export class DeleteChannelEndpoint {
  constructor(private readonly channelEndpointRepository: ChannelEndpointRepository) {}

  @InstrumentUsecase()
  async execute(command: DeleteChannelEndpointCommand): Promise<void> {
    const channelEndpoint = await this.channelEndpointRepository.findOne({
      identifier: command.identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!channelEndpoint) {
      throw new NotFoundException(`Channel endpoint with identifier '${command.identifier}' not found`);
    }

    await this.channelEndpointRepository.delete({
      _id: channelEndpoint._id,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });
  }
}
