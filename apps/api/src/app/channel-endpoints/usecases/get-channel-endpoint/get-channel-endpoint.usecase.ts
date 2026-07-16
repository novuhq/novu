import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptChannelConnectionAuth, InstrumentUsecase } from '@novu/application-generic';
import {
  ChannelConnectionRepository,
  ChannelEndpointDBModel,
  ChannelEndpointEntity,
  ChannelEndpointRepository,
  EnforceEnvOrOrgIds,
} from '@novu/dal';
import { FilterQuery } from 'mongoose';
import { extractWireEndpointFromAuth, getConnectionBackedEndpointConfig } from '../../connection-backed-endpoints';
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

    if (getConnectionBackedEndpointConfig(channelEndpoint.type)) {
      return await this.hydrateConnectionBackedEndpoint(channelEndpoint);
    }

    return channelEndpoint;
  }

  /**
   * The wire shape for connection-backed types (pagerduty_service,
   * opsgenie_integration) lives encrypted on the linked
   * `ChannelConnection.auth`; the stored `endpoint` document is empty.
   * Rehydrate it here so the response DTO reflects the wire contract on read
   * (matching create/update). Existing platform convention returns decrypted
   * secrets from the API; the dashboard masks client-side.
   */
  private async hydrateConnectionBackedEndpoint(endpoint: ChannelEndpointEntity): Promise<ChannelEndpointEntity> {
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
  }
}
