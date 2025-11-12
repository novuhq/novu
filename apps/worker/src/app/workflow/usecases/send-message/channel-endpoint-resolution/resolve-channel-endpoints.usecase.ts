import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  ChannelEndpointEntity,
  ChannelEndpointRepository,
} from '@novu/dal';
import { makeResourceKey, ProvidersIdEnum, RESOURCE } from '@novu/shared';
import { ChannelData, ENDPOINT_TYPES_REQUIRING_TOKEN } from '@novu/stateless';
import { ResolveChannelEndpointsCommand } from './resolve-channel-endpoints.command';

export type IntegrationEndpoints = {
  integrationIdentifier: string;
  providerId: ProvidersIdEnum;
  channelData: ChannelData[];
};

/**
 * Resolves channel endpoints for a subscriber and groups them by integration.
 *
 * Fetches endpoints (Slack channels, webhooks, phone numbers, etc.) filtered by subscriber,
 * channel type, and contextKeys. Enriches with connection data (OAuth tokens) if needed
 * and groups by integrationIdentifier to enable efficient fanout delivery.
 *
 * @example
 * Input: subscriberId="user-123", channelType="chat", contextKeys=["tenant-abc"]
 * Output: [
 *   {
 *     integrationIdentifier: "slack-integration-xyz",
 *     providerId: "slack",
 *     channelData: [
 *       { type: "slack_channel", endpoint: { channelId: "C123" }, token: "xoxb-..." },
 *       { type: "slack_channel", endpoint: { channelId: "C456" }, token: "xoxb-..." }
 *     ]
 *   }
 * ]
 */
@Injectable()
export class ResolveChannelEndpoints {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: ResolveChannelEndpointsCommand): Promise<IntegrationEndpoints[]> {
    const endpoints = await this.fetchChannelEndpoints(command);

    if (endpoints.length === 0) {
      return [];
    }

    const connectionMap = await this.fetchConnectionMap(command, endpoints);

    return this.buildIntegrationGroups(endpoints, connectionMap);
  }

  private async fetchChannelEndpoints(command: ResolveChannelEndpointsCommand): Promise<ChannelEndpointEntity[]> {
    const contextQuery = this.channelEndpointRepository.buildContextExactMatchQuery(command.contextKeys);

    return this.channelEndpointRepository.find({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      resource: makeResourceKey(RESOURCE.SUBSCRIBER, command.subscriberId),
      channel: command.channelType,
      ...contextQuery,
    });
  }

  private async fetchConnectionMap(
    command: ResolveChannelEndpointsCommand,
    endpoints: ChannelEndpointEntity[]
  ): Promise<Map<string, ChannelConnectionEntity>> {
    const connectionIdentifiers = this.extractUniqueConnectionIdentifiers(endpoints);

    if (connectionIdentifiers.length === 0) {
      return new Map();
    }

    const contextQuery = this.channelConnectionRepository.buildContextExactMatchQuery(command.contextKeys);

    const connections = await this.channelConnectionRepository.find({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier: { $in: connectionIdentifiers },
      ...contextQuery,
    });

    return new Map(connections.map((conn) => [conn.identifier, conn]));
  }

  private extractUniqueConnectionIdentifiers(endpoints: ChannelEndpointEntity[]): string[] {
    const identifiers = endpoints
      .map((endpoint) => endpoint.connectionIdentifier)
      .filter((id): id is string => Boolean(id));

    return [...new Set(identifiers)];
  }

  private buildIntegrationGroups(
    endpoints: ChannelEndpointEntity[],
    connectionMap: Map<string, ChannelConnectionEntity>
  ): IntegrationEndpoints[] {
    const groupedByIntegration = this.groupEndpointsByIntegration(endpoints);

    return Array.from(groupedByIntegration.entries()).map(([integrationIdentifier, groupEndpoints]) =>
      this.buildIntegrationGroup(integrationIdentifier, groupEndpoints, connectionMap)
    );
  }

  private groupEndpointsByIntegration(endpoints: ChannelEndpointEntity[]): Map<string, ChannelEndpointEntity[]> {
    const groups = new Map<string, ChannelEndpointEntity[]>();

    for (const endpoint of endpoints) {
      const existing = groups.get(endpoint.integrationIdentifier) || [];
      existing.push(endpoint);
      groups.set(endpoint.integrationIdentifier, existing);
    }

    return groups;
  }

  private buildIntegrationGroup(
    integrationIdentifier: string,
    endpoints: ChannelEndpointEntity[],
    connectionMap: Map<string, ChannelConnectionEntity>
  ): IntegrationEndpoints {
    return {
      integrationIdentifier,
      providerId: endpoints[0].providerId,
      channelData: endpoints.map((endpoint) => this.buildChannelData(endpoint, connectionMap)),
    };
  }

  private buildChannelData(
    endpoint: ChannelEndpointEntity,
    connectionMap: Map<string, ChannelConnectionEntity>
  ): ChannelData {
    const baseData = {
      type: endpoint.type,
      identifier: endpoint.identifier,
      endpoint: endpoint.endpoint,
    };

    const requiresToken = ENDPOINT_TYPES_REQUIRING_TOKEN.includes(
      endpoint.type as (typeof ENDPOINT_TYPES_REQUIRING_TOKEN)[number]
    );

    if (requiresToken) {
      const token = this.extractAccessToken(endpoint, connectionMap);
      return { ...baseData, token: token || '' } as ChannelData;
    }

    return baseData as ChannelData;
  }

  private extractAccessToken(
    endpoint: ChannelEndpointEntity,
    connectionMap: Map<string, ChannelConnectionEntity>
  ): string | undefined {
    if (!endpoint.connectionIdentifier) {
      return undefined;
    }

    const connection = connectionMap.get(endpoint.connectionIdentifier);
    if (!connection?.auth) {
      return undefined;
    }

    return 'accessToken' in connection.auth ? connection.auth.accessToken : undefined;
  }
}
