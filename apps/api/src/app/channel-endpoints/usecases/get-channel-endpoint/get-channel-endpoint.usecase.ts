import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptChannelConnectionAuth, InstrumentUsecase } from '@novu/application-generic';
import {
  ChannelConnectionRepository,
  ChannelEndpointDBModel,
  ChannelEndpointEntity,
  ChannelEndpointRepository,
  EnforceEnvOrOrgIds,
} from '@novu/dal';
import { ENDPOINT_TYPES } from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { GetChannelEndpointCommand } from './get-channel-endpoint.command';

@Injectable()
export class GetChannelEndpoint {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: GetChannelEndpointCommand): Promise<ChannelEndpointEntity> {
    const query: FilterQuery<ChannelEndpointDBModel> & EnforceEnvOrOrgIds = {
      identifier: command.identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    };

    if (command.subscriberId) {
      query.subscriberId = command.subscriberId;
    }

    if (command.contextKeys !== undefined) {
      Object.assign(query, this.channelEndpointRepository.buildContextExactMatchQuery(command.contextKeys));
    }

    const channelEndpoint = await this.channelEndpointRepository.findOne(query);

    if (!channelEndpoint) {
      throw new NotFoundException(`Channel endpoint with identifier '${command.identifier}' not found`);
    }

    if (channelEndpoint.type === ENDPOINT_TYPES.PAGERDUTY_SERVICE) {
      return await this.hydratePagerDutyEndpoint(channelEndpoint);
    }

    return channelEndpoint;
  }

  /**
   * Rehydrate `{ routingKey, region }` from encrypted ChannelConnection.auth.
   * Matches platform convention of returning decrypted secrets; dashboard masks client-side.
   */
  private async hydratePagerDutyEndpoint(endpoint: ChannelEndpointEntity): Promise<ChannelEndpointEntity> {
    if (!endpoint.connectionIdentifier) {
      return endpoint;
    }

    const connection = await this.channelConnectionRepository.findOne({
      identifier: endpoint.connectionIdentifier,
      _environmentId: endpoint._environmentId,
      _organizationId: endpoint._organizationId,
    });

    if (!connection?.auth) {
      return endpoint;
    }

    const decrypted = decryptChannelConnectionAuth(connection.auth) as {
      routingKey?: string;
      region?: 'us' | 'eu';
    } | null;

    if (!decrypted?.routingKey || !decrypted?.region) {
      return endpoint;
    }

    return {
      ...endpoint,
      endpoint: { routingKey: decrypted.routingKey, region: decrypted.region },
    } as ChannelEndpointEntity;
  }
}
