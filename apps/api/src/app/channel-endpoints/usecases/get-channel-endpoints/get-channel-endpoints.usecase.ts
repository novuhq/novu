import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import type { EnforceEnvOrOrgIds } from '@novu/dal';
import { ChannelEndpointDBModel, ChannelEndpointEntity, ChannelEndpointRepository } from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { mapChannelEndpointEntityToDto } from '../../dtos/dto.mapper';
import { GetChannelEndpointResponseDto } from '../../dtos/get-channel-endpoint-response.dto';
import { GetChannelEndpointsCommand } from './get-channel-endpoints.command';

@Injectable()
export class GetChannelEndpoints {
  constructor(private readonly channelEndpointRepository: ChannelEndpointRepository) {}

  @InstrumentUsecase()
  async execute(command: GetChannelEndpointsCommand): Promise<GetChannelEndpointResponseDto[]> {
    const channelEndpoints = await this.fetchChannelEndpoints(command);

    if (channelEndpoints.length === 0) {
      return [];
    }

    return this.mapAndFilterEndpoints(channelEndpoints);
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

  private mapAndFilterEndpoints(channelEndpoints: ChannelEndpointEntity[]): GetChannelEndpointResponseDto[] {
    return channelEndpoints.map((endpoint) => mapChannelEndpointEntityToDto(endpoint));
  }
}
