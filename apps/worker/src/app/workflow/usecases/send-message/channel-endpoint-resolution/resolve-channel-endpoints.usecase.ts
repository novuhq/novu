import { Injectable } from '@nestjs/common';
import {
  type ChannelConnectionAuth,
  decryptChannelConnectionAuth,
  decryptCredentials,
  encryptChannelConnectionAuth,
  InstrumentUsecase,
  MsTeamsTokenService,
  type WebexTokenRefreshResponse,
  WebexTokenService,
} from '@novu/application-generic';
import {
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  ChannelEndpointEntity,
  ChannelEndpointRepository,
  IntegrationRepository,
} from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { ChannelData, ENDPOINT_TYPES, ENDPOINT_TYPES_REQUIRING_TOKEN } from '@novu/stateless';
import { ResolveChannelEndpointsCommand } from './resolve-channel-endpoints.command';

const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;

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
  private readonly webexRefreshPromises = new Map<string, Promise<Record<string, unknown>>>();

  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly msTeamsTokenService: MsTeamsTokenService,
    private readonly webexTokenService: WebexTokenService
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

    if (endpoint.type === ENDPOINT_TYPES.WEBEX_ROOM || endpoint.type === ENDPOINT_TYPES.WEBEX_PERSON) {
      return await this.extractWebexToken(endpoint, connectionMap);
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

    /*
     * The subscriber's Azure AD tenant. Prefer the linked admin-consent connection's workspace id,
     * then fall back to the tenant stored on the endpoint itself (set for multi-tenant /
     * auto-provisioned MS Teams users that have no separate connection). For multi-tenant
     * distribution this can be an external customer tenant, not the bot's home tenant.
     */
    const endpointTenantId = (endpoint.endpoint as { tenantId?: string }).tenantId;
    const subscriberTenantId = connection?.workspace?.id ?? endpointTenantId;

    if (!subscriberTenantId) {
      throw new Error(`MS Teams endpoint ${endpoint.identifier} requires a connection or endpoint tenant ID`);
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
    const token = await this.msTeamsTokenService.getBotFrameworkToken(clientId, secretKey, tenantId);

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

    if (!('accessToken' in connection.auth)) {
      return undefined;
    }

    const decryptedAuth = decryptChannelConnectionAuth(connection.auth);

    return decryptedAuth?.accessToken;
  }

  private async extractWebexToken(
    endpoint: ChannelEndpointEntity,
    connectionMap: Map<string, ChannelConnectionEntity>
  ): Promise<Record<string, unknown>> {
    const connection = endpoint.connectionIdentifier ? connectionMap.get(endpoint.connectionIdentifier) : undefined;

    if (!connection?.auth) {
      throw new Error(`Webex endpoint ${endpoint.identifier} requires a channel connection`);
    }

    const decryptedAuth = decryptChannelConnectionAuth(connection.auth);
    const accessToken = decryptedAuth?.accessToken;

    if (!accessToken) {
      throw new Error(`Webex channel connection ${connection.identifier} is missing an access token`);
    }

    if (!this.shouldRefreshToken(decryptedAuth.expiresAt)) {
      return { token: accessToken };
    }

    if (!decryptedAuth.refreshToken) {
      throw new Error(`Webex channel connection ${connection.identifier} is missing a refresh token`);
    }

    const refreshKey = this.buildWebexRefreshKey(connection);
    const existingRefresh = this.webexRefreshPromises.get(refreshKey);

    if (existingRefresh) {
      return await existingRefresh;
    }

    const refreshPromise = this.refreshWebexConnectionToken(endpoint, connection, decryptedAuth);
    this.webexRefreshPromises.set(refreshKey, refreshPromise);

    try {
      return await refreshPromise;
    } finally {
      this.webexRefreshPromises.delete(refreshKey);
    }
  }

  private async refreshWebexConnectionToken(
    endpoint: ChannelEndpointEntity,
    connection: ChannelConnectionEntity,
    decryptedAuth: ChannelConnectionAuth
  ): Promise<Record<string, unknown>> {
    if (!decryptedAuth.refreshToken) {
      throw new Error(`Webex channel connection ${connection.identifier} is missing a refresh token`);
    }

    const integration = await this.integrationRepository.findOne({
      identifier: endpoint.integrationIdentifier,
      _environmentId: endpoint._environmentId,
      _organizationId: endpoint._organizationId,
    });

    if (!integration?.credentials) {
      throw new Error(`Integration ${endpoint.integrationIdentifier} missing credentials for Webex Messaging`);
    }

    const credentials = decryptCredentials(integration.credentials);
    const { clientId, secretKey } = credentials;

    if (!clientId || !secretKey) {
      throw new Error(`Integration ${endpoint.integrationIdentifier} missing required Webex OAuth credentials`);
    }

    const refreshed = await this.webexTokenService.refreshAccessToken(decryptedAuth.refreshToken, clientId, secretKey);

    if (!refreshed.access_token) {
      throw new Error(`Webex token refresh did not return an access token for connection ${connection.identifier}`);
    }

    const refreshedAuth = {
      ...decryptedAuth,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? decryptedAuth.refreshToken,
      expiresAt: this.buildExpiresAt(refreshed.expires_in) ?? decryptedAuth.expiresAt,
      refreshTokenExpiresAt:
        this.buildExpiresAt(refreshed.refresh_token_expires_in) ?? decryptedAuth.refreshTokenExpiresAt,
    };

    await this.channelConnectionRepository.findOneAndUpdate(
      {
        _environmentId: endpoint._environmentId,
        _organizationId: endpoint._organizationId,
        identifier: connection.identifier,
      },
      {
        $set: {
          auth: encryptChannelConnectionAuth(refreshedAuth),
        },
      }
    );

    return { token: refreshedAuth.accessToken };
  }

  private buildWebexRefreshKey(connection: ChannelConnectionEntity): string {
    return `${connection._organizationId}:${connection._environmentId}:${connection.identifier}`;
  }

  private shouldRefreshToken(expiresAt?: string): boolean {
    if (!expiresAt) {
      return false;
    }

    const expiresAtTime = new Date(expiresAt).getTime();

    if (Number.isNaN(expiresAtTime)) {
      return false;
    }

    return expiresAtTime - Date.now() <= TOKEN_REFRESH_WINDOW_MS;
  }

  private buildExpiresAt(expiresInSeconds?: WebexTokenRefreshResponse['expires_in']): string | undefined {
    if (!expiresInSeconds) {
      return undefined;
    }

    return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  }
}
