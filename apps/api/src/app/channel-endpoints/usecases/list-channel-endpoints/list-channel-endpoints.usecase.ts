import { BadRequestException, Injectable } from '@nestjs/common';
import { decryptChannelConnectionAuth, InstrumentUsecase } from '@novu/application-generic';
import type { EnforceEnvOrOrgIds } from '@novu/dal';
import {
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  ChannelEndpointDBModel,
  ChannelEndpointEntity,
  ChannelEndpointRepository,
} from '@novu/dal';
import { DirectionEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { extractWireEndpointFromAuth, getConnectionBackedEndpointConfig } from '../../connection-backed-endpoints';
import { ListChannelEndpointsCommand } from './list-channel-endpoints.command';

@Injectable()
export class ListChannelEndpoints {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository
  ) {}

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
      // Apply context filter under `$and` so it survives the cursor-pagination
      // helper, which sets its own top-level `$or` and would otherwise drop
      // the `$or` form returned for the empty/default-context case.
      filter.$and = [
        ...(filter.$and ?? []),
        this.channelEndpointRepository.buildContextExactMatchQuery(command.contextKeys),
      ];
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

    const hydratedData = await this.hydrateConnectionBackedEndpoints(
      pagination.data as ChannelEndpointEntity[],
      command.user.environmentId,
      command.user.organizationId
    );

    return {
      data: hydratedData,
      next: pagination.next,
      previous: pagination.previous,
      totalCount: pagination.totalCount,
      totalCountCapped: pagination.totalCountCapped,
    };
  }

  /**
   * Batch-hydrate connection-backed endpoint wire shapes (pagerduty_service,
   * opsgenie_integration) from their linked connections in a single `$in`
   * query so a page of N such rows costs one extra roundtrip instead of N.
   * See `GetChannelEndpoint.hydrateConnectionBackedEndpoint` for the
   * underlying rationale.
   */
  private async hydrateConnectionBackedEndpoints(
    endpoints: ChannelEndpointEntity[],
    environmentId: string,
    organizationId: string
  ): Promise<ChannelEndpointEntity[]> {
    const connectionBackedEndpoints = endpoints.filter(
      (endpoint) => getConnectionBackedEndpointConfig(endpoint.type) && endpoint.connectionIdentifier
    );

    if (connectionBackedEndpoints.length === 0) {
      return endpoints;
    }

    const connectionIdentifiers = connectionBackedEndpoints
      .map((endpoint) => endpoint.connectionIdentifier)
      .filter((identifier): identifier is string => Boolean(identifier));

    const connections = await this.channelConnectionRepository.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
      identifier: { $in: connectionIdentifiers },
    });

    const connectionsByIdentifier = new Map<string, ChannelConnectionEntity>(
      connections.map((connection) => [connection.identifier, connection])
    );

    return endpoints.map((endpoint) => {
      if (!getConnectionBackedEndpointConfig(endpoint.type) || !endpoint.connectionIdentifier) {
        return endpoint;
      }

      const connection = connectionsByIdentifier.get(endpoint.connectionIdentifier);
      if (!connection?.auth) {
        return endpoint;
      }

      const decrypted = decryptChannelConnectionAuth(connection.auth) as Record<string, unknown> | null;

      if (!decrypted) {
        return endpoint;
      }

      const wireEndpoint = extractWireEndpointFromAuth(endpoint.type, decrypted);

      if (!wireEndpoint) {
        return endpoint;
      }

      return {
        ...endpoint,
        endpoint: wireEndpoint,
      } as ChannelEndpointEntity;
    });
  }
}
