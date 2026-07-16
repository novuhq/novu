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

    // Both the subscriber-vs-shared clause and the context match may produce an `$or`,
    // so compose them under `$and` to keep them from clobbering one another.
    const and: FilterQuery<ChannelConnectionDBModel>[] = [];

    if (command.subscriberId) {
      if (command.connectionMode === 'subscriber') {
        query.subscriberId = command.subscriberId;
      } else if (command.connectionMode === 'shared') {
        query.subscriberId = null;
      } else {
        // Default: match the subscriber's own connection or any shared one.
        and.push({ $or: [{ subscriberId: command.subscriberId }, { subscriberId: null }] });
      }
    }

    if (command.contextKeys !== undefined) {
      and.push(this.channelConnectionRepository.buildContextExactMatchQuery(command.contextKeys));
    }

    if (and.length > 0) {
      query.$and = and;
    }

    const channelConnection = await this.channelConnectionRepository.findOne(query);

    if (!channelConnection) {
      throw new NotFoundException(`Channel connection with identifier '${command.identifier}' not found`);
    }

    return channelConnection;
  }
}
