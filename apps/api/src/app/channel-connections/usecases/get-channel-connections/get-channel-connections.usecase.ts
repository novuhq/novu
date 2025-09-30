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
import { GetChannelConnectionsCommand } from './get-channel-connections.command';

@Injectable()
export class GetChannelConnections {
  constructor(private readonly channelConnectionRepository: ChannelConnectionRepository) {}

  @InstrumentUsecase()
  async execute(command: GetChannelConnectionsCommand): Promise<ChannelConnectionEntity[]> {
    const channelConnections = await this.fetchChannelConnections(command);

    return channelConnections;
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
}
