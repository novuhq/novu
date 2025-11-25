import { Injectable, Logger } from '@nestjs/common';
import { CachedResponse, decryptCredentials, InstrumentUsecase } from '@novu/application-generic';
import {
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  ChannelEndpointEntity,
  ChannelEndpointRepository,
  IntegrationRepository,
} from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { ChannelData, ENDPOINT_TYPES, ENDPOINT_TYPES_REQUIRING_TOKEN } from '@novu/stateless';
import axios from 'axios';
import { ResolveChannelEndpointsCommand } from './resolve-channel-endpoints.command';

export type IntegrationEndpoints = {
  integrationIdentifier: string;
  providerId: ProvidersIdEnum;
  channelData: ChannelData[];
};

/**
 * Resolves channel endpoints for a subscriber and groups them by integration.
 *
 * Fetches endpoints (Slack channels, MS Teams channels, webhooks, phone numbers, etc.)
 * filtered by subscriber, channel type, and contextKeys. Enriches with connection data
 * (OAuth tokens, tenant IDs) if needed and groups by integrationIdentifier to enable
 * efficient fanout delivery.
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
  private readonly logger = new Logger(ResolveChannelEndpoints.name);

  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository
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
      subscriberId: command.subscriberId,
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

  private async buildIntegrationGroups(
    endpoints: ChannelEndpointEntity[],
    connectionMap: Map<string, ChannelConnectionEntity>
  ): Promise<IntegrationEndpoints[]> {
    const groupedByIntegration = this.groupEndpointsByIntegration(endpoints);

    return await Promise.all(
      Array.from(groupedByIntegration.entries()).map(([integrationIdentifier, groupEndpoints]) =>
        this.buildIntegrationGroup(integrationIdentifier, groupEndpoints, connectionMap)
      )
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

  private async buildIntegrationGroup(
    integrationIdentifier: string,
    endpoints: ChannelEndpointEntity[],
    connectionMap: Map<string, ChannelConnectionEntity>
  ): Promise<IntegrationEndpoints> {
    return {
      integrationIdentifier,
      providerId: endpoints[0].providerId,
      channelData: await Promise.all(endpoints.map((endpoint) => this.buildChannelData(endpoint, connectionMap))),
    };
  }

  private async buildChannelData(
    endpoint: ChannelEndpointEntity,
    connectionMap: Map<string, ChannelConnectionEntity>
  ): Promise<ChannelData> {
    const baseData = {
      type: endpoint.type,
      identifier: endpoint.identifier,
      endpoint: endpoint.endpoint,
    };

    const requiresToken = ENDPOINT_TYPES_REQUIRING_TOKEN.includes(
      endpoint.type as (typeof ENDPOINT_TYPES_REQUIRING_TOKEN)[number]
    );

    if (requiresToken) {
      const tokenData = await this.extractToken(endpoint, connectionMap);
      return { ...baseData, ...tokenData } as ChannelData;
    }

    return baseData as ChannelData;
  }

  /**
   * Extracts token for endpoint based on type
   * - MS Teams: Fetches Bot Framework token from Microsoft
   * - Slack: Extracts OAuth token from connection
   */
  private async extractToken(
    endpoint: ChannelEndpointEntity,
    connectionMap: Map<string, ChannelConnectionEntity>
  ): Promise<Record<string, unknown>> {
    // MS Teams endpoints - fetch Bot Framework token
    if (endpoint.type === ENDPOINT_TYPES.MS_TEAMS_CHANNEL || endpoint.type === ENDPOINT_TYPES.MS_TEAMS_USER) {
      return await this.extractMsTeamsToken(endpoint, connectionMap);
    }

    // Slack and other connection-based tokens
    const token = this.extractConnectionToken(endpoint, connectionMap);
    return { token: token || '' };
  }

  /**
   * Extracts MS Teams Bot Framework token and additional data
   */
  private async extractMsTeamsToken(
    endpoint: ChannelEndpointEntity,
    connectionMap: Map<string, ChannelConnectionEntity>
  ): Promise<Record<string, unknown>> {
    const connection = endpoint.connectionIdentifier ? connectionMap.get(endpoint.connectionIdentifier) : undefined;
    const subscriberTenantId = connection?.workspace?.id;

    if (!subscriberTenantId) {
      throw new Error(`MS Teams endpoint ${endpoint.identifier} requires a connection with tenant ID`);
    }

    // Fetch integration credentials
    const integration = await this.integrationRepository.findOne({
      identifier: endpoint.integrationIdentifier,
      _environmentId: endpoint._environmentId,
      _organizationId: endpoint._organizationId,
    });

    if (!integration?.credentials) {
      throw new Error(`Integration ${endpoint.integrationIdentifier} missing credentials for MS Teams`);
    }

    const decryptedCredentials = decryptCredentials(integration.credentials);
    const { clientId, secretKey, tenantId } = decryptedCredentials;
    if (!clientId || !secretKey || !tenantId) {
      throw new Error(`Integration ${endpoint.integrationIdentifier} missing required MS Teams credentials`);
    }

    // Fetch Bot Framework token with caching
    const token = await this.getMsTeamsBotToken(clientId, secretKey, tenantId);

    // For user DMs, include clientId (bot app ID) needed to create conversation
    if (endpoint.type === ENDPOINT_TYPES.MS_TEAMS_USER) {
      return { subscriberTenantId, token, clientId };
    }

    return { subscriberTenantId, token };
  }

  /**
   * Extracts OAuth token from connection (Slack, etc.)
   */
  private extractConnectionToken(
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

  /**
   * Fetches Bot Framework token for MS Teams with caching
   * Cache key: msteams:bot-token:{clientId}:{appTenantId}
   * TTL: 55 minutes (1 hour token - 5 min safety buffer)
   *
   * Note: Returns empty string on failure to allow graceful degradation.
   * Provider will fail with clear error message that bubbles to customer.
   */
  @CachedResponse<string>({
    builder: (clientId: string, _secretKey: string, appTenantId: string) =>
      `msteams:bot-token:${clientId}:${appTenantId}`,
    options: {
      ttl: 3300, // 55 minutes (3600 - 300 seconds)
      skipSaveToCache: (token: string) => token === '', // Don't cache failures
    },
  })
  private async getMsTeamsBotToken(clientId: string, secretKey: string, appTenantId: string): Promise<string> {
    const tokenUrl = `https://login.microsoftonline.com/${appTenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: secretKey,
      scope: 'https://api.botframework.com/.default',
    });

    try {
      const response = await axios.post<{ access_token: string; expires_in: number }>(tokenUrl, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return response.data.access_token;
    } catch (error) {
      // Log error but return empty string to allow graceful degradation
      // Provider will fail with proper error that reaches customer
      const errorMessage =
        axios.isAxiosError(error) && error.response
          ? `Failed to fetch MS Teams bot token: ${error.response.status} - ${JSON.stringify(error.response.data)}`
          : `Failed to fetch MS Teams bot token: ${error.message || error}`;

      this.logger.error(errorMessage, error.stack);

      return ''; // Empty token will cause provider to fail with clear error
    }
  }
}
