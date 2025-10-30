import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  ChannelConnectionDBModel,
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  EnforceEnvOrOrgIds,
} from '@novu/dal';
import { FilterQuery } from 'mongoose';
import { GetChannelConnectionCommand } from './get-channel-connection.command';

@Injectable()
export class GetChannelConnection {
  constructor(private readonly channelConnectionRepository: ChannelConnectionRepository) {}

  @InstrumentUsecase()
  async execute(command: GetChannelConnectionCommand): Promise<ChannelConnectionEntity> {
    const query: FilterQuery<ChannelConnectionDBModel> & EnforceEnvOrOrgIds = {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      identifier: command.identifier,
    };

    const channelConnection = await this.channelConnectionRepository.findOne(query);

    if (!channelConnection) {
      throw new NotFoundException(`Channel connection with identifier '${command.identifier}' not found`);
    }

    return channelConnection;
  }
}
