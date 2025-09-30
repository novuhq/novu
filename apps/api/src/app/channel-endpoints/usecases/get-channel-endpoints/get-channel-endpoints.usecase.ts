import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import type { EnforceEnvOrOrgIds } from '@novu/dal';
import { ChannelEndpointDBModel, ChannelEndpointEntity, ChannelEndpointRepository } from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { GetChannelEndpointsCommand } from './get-channel-endpoints.command';

@Injectable()
export class GetChannelEndpoints {
  constructor(private readonly channelEndpointRepository: ChannelEndpointRepository) {}

  @InstrumentUsecase()
  async execute(command: GetChannelEndpointsCommand): Promise<ChannelEndpointEntity[]> {
    const channelEndpoints = await this.fetchChannelEndpoints(command);

    return channelEndpoints;
  }

  private async fetchChannelEndpoints(command: GetChannelEndpointsCommand): Promise<ChannelEndpointEntity[]> {
    const query: FilterQuery<ChannelEndpointDBModel> & EnforceEnvOrOrgIds = {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    };

    if (command.resource) {
      query.resource = command.resource;
    }

    if (command.type) {
      query.type = command.type;
    }

    if (command.channel) {
      query.channel = command.channel;
    }

    if (command.provider) {
      query.providerId = command.provider;
    }

    return await this.channelEndpointRepository.find(query);
  }
}
