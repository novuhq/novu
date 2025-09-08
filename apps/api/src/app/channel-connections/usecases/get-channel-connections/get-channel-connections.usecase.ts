import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  ChannelConnectionDBModel,
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  EnforceEnvOrOrgIds,
} from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { mapChannelConnectionEntityToDto } from '../../dtos/dto.mapper';
import { GetChannelConnectionResponseDto } from '../../dtos/get-channel-connection-response.dto';
import { GetChannelConnectionsCommand } from './get-channel-connections.command';

@Injectable()
export class GetChannelConnections {
  constructor(private readonly channelConnectionRepository: ChannelConnectionRepository) {}

  @InstrumentUsecase()
  async execute(command: GetChannelConnectionsCommand): Promise<GetChannelConnectionResponseDto[]> {
    const channelConnections = await this.fetchChannelConnections(command);

    if (channelConnections.length === 0) {
      return [];
    }

    return this.mapAndFilterConnections(channelConnections);
  }

  private async fetchChannelConnections(command: GetChannelConnectionsCommand): Promise<ChannelConnectionEntity[]> {
    const query: FilterQuery<ChannelConnectionDBModel> & EnforceEnvOrOrgIds = {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      resource: command.resource,
    };

    if (command.channel) {
      query.channel = command.channel;
    }

    if (command.provider) {
      query.providerId = command.provider;
    }

    return await this.channelConnectionRepository.find(query);
  }

  private mapAndFilterConnections(channelConnections: ChannelConnectionEntity[]): GetChannelConnectionResponseDto[] {
    return channelConnections.map((conn) => mapChannelConnectionEntityToDto(conn));
  }
}
