import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  ChannelEndpointDBModel,
  ChannelEndpointEntity,
  ChannelEndpointRepository,
  EnforceEnvOrOrgIds,
} from '@novu/dal';
import { FilterQuery } from 'mongoose';
import { GetChannelEndpointCommand } from './get-channel-endpoint.command';

@Injectable()
export class GetChannelEndpoint {
  constructor(private readonly channelEndpointRepository: ChannelEndpointRepository) {}

  @InstrumentUsecase()
  async execute(command: GetChannelEndpointCommand): Promise<ChannelEndpointEntity> {
    const query: FilterQuery<ChannelEndpointDBModel> & EnforceEnvOrOrgIds = {
      identifier: command.identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    };

    if (command.subscriberId) {
      query.subscriberId = command.subscriberId;
    }

    if (command.contextKeys !== undefined) {
      Object.assign(query, this.channelEndpointRepository.buildContextExactMatchQuery(command.contextKeys));
    }

    const channelEndpoint = await this.channelEndpointRepository.findOne(query);

    if (!channelEndpoint) {
      throw new NotFoundException(`Channel endpoint with identifier '${command.identifier}' not found`);
    }

    return channelEndpoint;
  }
}
