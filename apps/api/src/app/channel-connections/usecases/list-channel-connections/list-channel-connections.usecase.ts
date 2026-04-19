import { BadRequestException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  ChannelConnectionDBModel,
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  EnforceEnvOrOrgIds,
} from '@novu/dal';
import { DirectionEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { ListChannelConnectionsCommand } from './list-channel-connections.command';

@Injectable()
export class ListChannelConnections {
  constructor(private readonly channelConnectionRepository: ChannelConnectionRepository) {}

  @InstrumentUsecase()
  async execute(command: ListChannelConnectionsCommand) {
    if (command.before && command.after) {
      throw new BadRequestException('Cannot specify both "before" and "after" cursors at the same time.');
    }

    const filter: FilterQuery<ChannelConnectionDBModel> & EnforceEnvOrOrgIds = {
      _environmentId: command.user.environmentId,
      _organizationId: command.user.organizationId,
    };

    if (command.subscriberId) {
      filter.subscriberId = command.subscriberId;
    }

    if (command.channel) {
      filter.channel = command.channel;
    }

    if (command.providerId) {
      filter.providerId = command.providerId;
    }

    if (command.integrationIdentifier) {
      filter.integrationIdentifier = command.integrationIdentifier;
    }

    if (command.contextKeys !== undefined) {
      const contextQuery = this.channelConnectionRepository.buildContextExactMatchQuery(command.contextKeys);
      filter.contextKeys = contextQuery.contextKeys;
    }

    let channelConnection: ChannelConnectionEntity | null = null;
    const id = command.before || command.after;

    if (id) {
      channelConnection = await this.channelConnectionRepository.findOne({
        _environmentId: command.user.environmentId,
        _organizationId: command.user.organizationId,
        _id: id,
      });

      if (!channelConnection) {
        return {
          data: [],
          next: null,
          previous: null,
          totalCount: 0,
          totalCountCapped: false,
        };
      }
    }

    const afterCursor =
      command.after && channelConnection
        ? {
            sortBy: channelConnection[command.orderBy || 'createdAt'],
            paginateField: channelConnection._id,
          }
        : undefined;

    const beforeCursor =
      command.before && channelConnection
        ? {
            sortBy: channelConnection[command.orderBy || 'createdAt'],
            paginateField: channelConnection._id,
          }
        : undefined;

    const pagination = await this.channelConnectionRepository.findWithCursorBasedPagination({
      query: filter,
      paginateField: '_id',
      sortBy: command.orderBy || 'createdAt',
      sortDirection: command.orderDirection || DirectionEnum.DESC,
      limit: command.limit,
      after: afterCursor,
      before: beforeCursor,
      includeCursor: command.includeCursor,
    });

    return {
      data: pagination.data,
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
    };
  }
}
