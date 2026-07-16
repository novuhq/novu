import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  ChannelConnectionRepository,
  ChannelEndpointDBModel,
  ChannelEndpointEntity,
  ChannelEndpointRepository,
  EnforceEnvOrOrgIds,
} from '@novu/dal';
import { FilterQuery } from 'mongoose';
import { hydrateEndpointFromConnection, isConnectionBackedEndpoint } from '../../connection-backed-endpoints';
import { GetChannelEndpointCommand } from './get-channel-endpoint.command';

@Injectable()
export class GetChannelEndpoint {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository
  ) {}

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

    if (isConnectionBackedEndpoint(channelEndpoint.type) && channelEndpoint.connectionIdentifier) {
      const connection = await this.channelConnectionRepository.findOne({
        identifier: channelEndpoint.connectionIdentifier,
        _environmentId: channelEndpoint._environmentId,
        _organizationId: channelEndpoint._organizationId,
      });

      return hydrateEndpointFromConnection(channelEndpoint, connection);
    }

    return channelEndpoint;
  }
}
