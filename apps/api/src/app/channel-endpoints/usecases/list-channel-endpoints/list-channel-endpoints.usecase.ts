import { BadRequestException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import type { EnforceEnvOrOrgIds } from '@novu/dal';
import { ChannelEndpointDBModel, ChannelEndpointEntity, ChannelEndpointRepository } from '@novu/dal';
import { DirectionEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { ListChannelEndpointsCommand } from './list-channel-endpoints.command';

@Injectable()
export class ListChannelEndpoints {
  constructor(private readonly channelEndpointRepository: ChannelEndpointRepository) {}

  @InstrumentUsecase()
  async execute(command: ListChannelEndpointsCommand) {
    if (command.before && command.after) {
      throw new BadRequestException('Cannot specify both "before" and "after" cursors at the same time.');
    }

    const filter: FilterQuery<ChannelEndpointDBModel> & EnforceEnvOrOrgIds = {
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

    if (command.connectionIdentifier) {
      filter.connectionIdentifier = command.connectionIdentifier;
    }

    if (command.contextKeys !== undefined) {
      const contextQuery = this.channelEndpointRepository.buildContextExactMatchQuery(command.contextKeys);
      filter.contextKeys = contextQuery.contextKeys;
    }

    let channelEndpoint: ChannelEndpointEntity | null = null;
    const id = command.before || command.after;

    if (id) {
      channelEndpoint = await this.channelEndpointRepository.findOne({
        _environmentId: command.user.environmentId,
        _organizationId: command.user.organizationId,
        _id: id,
      });

      if (!channelEndpoint) {
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
      command.after && channelEndpoint
        ? {
            sortBy: channelEndpoint[command.orderBy || 'createdAt'],
            paginateField: channelEndpoint._id,
          }
        : undefined;

    const beforeCursor =
      command.before && channelEndpoint
        ? {
            sortBy: channelEndpoint[command.orderBy || 'createdAt'],
            paginateField: channelEndpoint._id,
          }
        : undefined;

    const pagination = await this.channelEndpointRepository.findWithCursorBasedPagination({
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
