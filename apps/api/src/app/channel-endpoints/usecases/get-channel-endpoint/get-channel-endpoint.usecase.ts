import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ChannelEndpointEntity, ChannelEndpointRepository } from '@novu/dal';
import { GetChannelEndpointCommand } from './get-channel-endpoint.command';

@Injectable()
export class GetChannelEndpoint {
  constructor(private readonly channelEndpointRepository: ChannelEndpointRepository) {}

  @InstrumentUsecase()
  async execute(command: GetChannelEndpointCommand): Promise<ChannelEndpointEntity> {
    const channelEndpoint = await this.channelEndpointRepository.findOne({
      identifier: command.identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!channelEndpoint) {
      throw new NotFoundException(`Channel endpoint with identifier '${command.identifier}' not found`);
    }

    return channelEndpoint;
  }
}
