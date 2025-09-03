import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import type { EnforceEnvOrOrgIds } from '@novu/dal';
import {
  ChannelAddressDBModel,
  ChannelAddressEntity,
  ChannelAddressRepository,
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { GetChannelAddressResponseDto } from '../../dtos/get-channel-address-response.dto';
import { GetChannelAddressesCommand } from './get-channel-addresses.command';

@Injectable()
export class GetChannelAddresses {
  constructor(
    private readonly channelAddressRepository: ChannelAddressRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: GetChannelAddressesCommand): Promise<GetChannelAddressResponseDto[]> {
    const channelAddresses = await this.fetchChannelAddresses(command);

    if (channelAddresses.length === 0) {
      return [];
    }

    const integrationLookupMap = await this.buildIntegrationLookupMap(command, channelAddresses);
    const connectionLookupMap = await this.buildConnectionLookupMap(command, channelAddresses);

    return this.mapAndFilterAddresses(channelAddresses, integrationLookupMap, connectionLookupMap);
  }

  private async fetchChannelAddresses(command: GetChannelAddressesCommand): Promise<ChannelAddressEntity[]> {
    const query: FilterQuery<ChannelAddressDBModel> & EnforceEnvOrOrgIds = {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    };

    if (command.resource) {
      query.resource = command.resource;
    }

    if (command.type) {
      query.type = command.type;
    }

    return await this.channelAddressRepository.find(query);
  }

  private async buildIntegrationLookupMap(
    command: GetChannelAddressesCommand,
    channelAddresses: ChannelAddressEntity[]
  ): Promise<Map<string, IntegrationEntity>> {
    const integrationIds = [...new Set(channelAddresses.map((addr) => addr._integrationId))];
    const integrations = await this.fetchFilteredIntegrations(command, integrationIds);

    return this.createIntegrationLookupMap(integrations);
  }

  private async buildConnectionLookupMap(
    command: GetChannelAddressesCommand,
    channelAddresses: ChannelAddressEntity[]
  ): Promise<Map<string, ChannelConnectionEntity>> {
    const connectionIds = [...new Set(channelAddresses.map((addr) => addr._connectionId).filter(Boolean))] as string[];

    if (connectionIds.length === 0) {
      return new Map();
    }

    const connections = await this.channelConnectionRepository.find({
      _id: { $in: connectionIds },
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    return this.createConnectionLookupMap(connections);
  }

  private async fetchFilteredIntegrations(
    command: GetChannelAddressesCommand,
    integrationIds: string[]
  ): Promise<IntegrationEntity[]> {
    const integrationQuery = {
      _id: { $in: integrationIds },
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      ...this.buildIntegrationFilter(command),
    };

    return await this.integrationRepository.find(integrationQuery);
  }

  private buildIntegrationFilter(command: GetChannelAddressesCommand): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (command.channel) {
      filter.channel = command.channel;
    }

    if (command.provider) {
      filter.providerId = command.provider;
    }

    return filter;
  }

  private createIntegrationLookupMap(integrations: IntegrationEntity[]): Map<string, IntegrationEntity> {
    const lookupMap = new Map<string, IntegrationEntity>();

    for (const integration of integrations) {
      lookupMap.set(integration._id, integration);
    }

    return lookupMap;
  }

  private createConnectionLookupMap(connections: ChannelConnectionEntity[]): Map<string, ChannelConnectionEntity> {
    const lookupMap = new Map<string, ChannelConnectionEntity>();

    for (const connection of connections) {
      lookupMap.set(connection._id, connection);
    }

    return lookupMap;
  }

  private mapAndFilterAddresses(
    channelAddresses: ChannelAddressEntity[],
    integrationLookupMap: Map<string, IntegrationEntity>,
    connectionLookupMap: Map<string, ChannelConnectionEntity>
  ): GetChannelAddressResponseDto[] {
    return channelAddresses
      .filter((addr) => integrationLookupMap.has(addr._integrationId))
      .map((addr) =>
        this.mapChannelAddressToDto(
          addr,
          integrationLookupMap.get(addr._integrationId),
          addr._connectionId ? connectionLookupMap.get(addr._connectionId) : undefined
        )
      );
  }

  private mapChannelAddressToDto(
    channelAddress: ChannelAddressEntity,
    integration?: IntegrationEntity,
    connection?: ChannelConnectionEntity
  ): GetChannelAddressResponseDto {
    return {
      identifier: channelAddress.identifier,
      channel: integration?.channel ?? null,
      provider: (integration?.providerId as ProvidersIdEnum) ?? null,
      integrationIdentifier: integration?.identifier ?? null,
      connectionIdentifier: connection?.identifier ?? null,
      type: channelAddress.type,
      address: channelAddress.address,
      createdAt: channelAddress.createdAt,
      updatedAt: channelAddress.updatedAt,
    };
  }
}
