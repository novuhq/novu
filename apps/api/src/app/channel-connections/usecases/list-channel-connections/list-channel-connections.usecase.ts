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
      if (command.connectionMode === 'subscriber') {
        filter.subscriberId = command.subscriberId;
      } else if (command.connectionMode === 'shared') {
        filter.subscriberId = null;
      } else {
        // Default: return the subscriber's own connections plus any shared ones.
        // Pushed under `$and` so it composes with the context clause and survives
        // the cursor-pagination helper's own top-level `$or`.
        filter.$and = [
          ...(filter.$and ?? []),
          { $or: [{ subscriberId: command.subscriberId }, { subscriberId: null }] },
        ];
      }
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
      // Apply context filter under `$and` so it survives the cursor-pagination
      // helper, which sets its own top-level `$or` and would otherwise drop
      // the `$or` form returned for the empty/default-context case.
      filter.$and = [
        ...(filter.$and ?? []),
        this.channelConnectionRepository.buildContextExactMatchQuery(command.contextKeys),
      ];
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
