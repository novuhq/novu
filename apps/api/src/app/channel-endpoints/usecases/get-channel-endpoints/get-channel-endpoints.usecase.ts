import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  ChannelEndpointEntity,
  ChannelEndpointRepository,
  IntegrationEntity,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { SubscriberResponseDto } from '../../../subscribers/dtos';
import { GetChannelEndpointResponseDto } from '../../dtos/get-channel-endpoint-response.dto';
import { GetChannelEndpointsCommand } from './get-channel-endpoints.command';

@Injectable()
export class GetChannelEndpoints {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: GetChannelEndpointsCommand): Promise<GetChannelEndpointResponseDto[]> {
    const subscriber = await this.validateSubscriberExists(command);
    const channelEndpoints = await this.fetchChannelEndpoints(command, subscriber);

    if (channelEndpoints.length === 0) {
      return [];
    }

    // TODO: concat other integrations until we migrate the data from sub to the new collection

    const integrationLookupMap = await this.buildIntegrationLookupMap(command, channelEndpoints);
    return this.mapAndFilterEndpoints(channelEndpoints, integrationLookupMap);
  }

  private async validateSubscriberExists(command: GetChannelEndpointsCommand): Promise<SubscriberResponseDto> {
    const subscriber = await this.subscriberRepository.findOne({
      subscriberId: command.subscriberId,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!subscriber) {
      throw new NotFoundException(`Subscriber with id '${command.subscriberId}' not found`);
    }

    return subscriber;
  }

  private async fetchChannelEndpoints(
    command: GetChannelEndpointsCommand,
    subscriber: SubscriberResponseDto
  ): Promise<ChannelEndpointEntity[]> {
    const query = {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      subscriberId: subscriber.subscriberId,
      ...this.buildEndpointFilter(command),
    };

    return await this.channelEndpointRepository.find(query);
  }

  private buildEndpointFilter(command: GetChannelEndpointsCommand): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (command.endpoint) {
      filter.endpoint = { $regex: command.endpoint, $options: 'i' };
    }

    return filter;
  }

  private async buildIntegrationLookupMap(
    command: GetChannelEndpointsCommand,
    channelEndpoints: ChannelEndpointEntity[]
  ): Promise<Map<string, IntegrationEntity>> {
    const integrationIds = [...new Set(channelEndpoints.map((endpoint) => endpoint._integrationId))];
    const integrations = await this.fetchFilteredIntegrations(command, integrationIds);

    return this.createIntegrationLookupMap(integrations);
  }

  private async fetchFilteredIntegrations(
    command: GetChannelEndpointsCommand,
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

  private buildIntegrationFilter(command: GetChannelEndpointsCommand): Record<string, unknown> {
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

  private mapAndFilterEndpoints(
    channelEndpoints: ChannelEndpointEntity[],
    integrationLookupMap: Map<string, IntegrationEntity>
  ): GetChannelEndpointResponseDto[] {
    return channelEndpoints
      .filter((endpoint) => integrationLookupMap.has(endpoint._integrationId))
      .map((endpoint) => this.mapChannelEndpointToDto(endpoint, integrationLookupMap.get(endpoint._integrationId)));
  }

  private mapChannelEndpointToDto(
    endpoint: ChannelEndpointEntity,
    integration?: IntegrationEntity
  ): GetChannelEndpointResponseDto {
    return {
      identifier: endpoint.identifier,
      channel: integration?.channel ?? null,
      provider: (integration?.providerId as ProvidersIdEnum) ?? null,
      integrationIdentifier: integration?.identifier ?? null,
      endpoint: endpoint.endpoint,
      routing: endpoint.routing,
      createdAt: endpoint.createdAt,
      updatedAt: endpoint.updatedAt,
    };
  }
}
