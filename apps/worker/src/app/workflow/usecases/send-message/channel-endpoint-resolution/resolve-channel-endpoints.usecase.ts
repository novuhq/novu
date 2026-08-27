import { Injectable } from '@nestjs/common';
import {
  decryptChannelConnectionAuth,
  decryptChannelEndpoint,
  decryptCredentials,
  InstrumentUsecase,
  MsTeamsTokenService,
  RotatingConnectionTokenService,
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

type EndpointStoredSecretConfig = {
  providerLabel: string;
  /** Fields that must all be present (non-empty) after decrypt; missing any triggers one combined error. */
  requiredFields: string[];
};

/**
 * Tool endpoint types whose per-subscriber routing secret lives on the
 * `ChannelEndpoint.endpoint` document. The resolver decrypts secret fields and
 * returns the decrypted wire shape at send time — no channel connection lookup.
 */
const ENDPOINT_STORED_SECRET_CONFIGS: Partial<Record<string, EndpointStoredSecretConfig>> = {
  [ENDPOINT_TYPES.PAGERDUTY_SERVICE]: { providerLabel: 'PagerDuty', requiredFields: ['routingKey', 'region'] },
  [ENDPOINT_TYPES.OPSGENIE_INTEGRATION]: { providerLabel: 'Opsgenie', requiredFields: ['apiKey', 'region'] },
  // authToken is optional and therefore not listed as required.
  [ENDPOINT_TYPES.GRAFANA_ONCALL_INTEGRATION]: { providerLabel: 'Grafana', requiredFields: ['url'] },
  [ENDPOINT_TYPES.TOOL_WEBHOOK]: { providerLabel: 'Tool Webhook', requiredFields: ['url'] },
};

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
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly msTeamsTokenService: MsTeamsTokenService,
    private readonly rotatingConnectionTokenService: RotatingConnectionTokenService
  ) {}

  @InstrumentUsecase()
  async execute(command: ResolveChannelEndpointsCommand): Promise<IntegrationEndpoints[]> {
    const endpoints = await this.fetchChannelEndpoints(command);

    if (endpoints.length === 0) {
      return [];
    }

    const deliverableEndpoints = await this.keepEndpointsForActiveIntegrations(command, endpoints);
    const connectionMap = await this.fetchConnectionMap(command, deliverableEndpoints);

    return this.buildIntegrationGroups(deliverableEndpoints, connectionMap);
  }

  private async keepEndpointsForActiveIntegrations(
    command: ResolveChannelEndpointsCommand,
    endpoints: ChannelEndpointEntity[]
  ): Promise<ChannelEndpointEntity[]> {
    const identifiers = [...new Set(endpoints.map((endpoint) => endpoint.integrationIdentifier))];

    const activeIntegrations = await this.integrationRepository.find(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        identifier: { $in: identifiers },
        channel: command.channelType,
        active: true,
      },
      'identifier'
    );
    const activeIdentifiers = new Set(activeIntegrations.map((integration) => integration.identifier));

    return endpoints.filter((endpoint) => activeIdentifiers.has(endpoint.integrationIdentifier));
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
   * Extracts token / hydrated endpoint data based on type
   * - MS Teams: Fetches Bot Framework token from Microsoft
   * - Slack / Webex: Reads the OAuth token from the connection, refreshing rotation-enabled tokens
   * - PagerDuty / Opsgenie / Grafana / Tool Webhook: Decrypts secrets from endpoint.endpoint and hydrates the endpoint wire shape
   */
  private async extractToken(
    endpoint: ChannelEndpointEntity,
    connectionMap: Map<string, ChannelConnectionEntity>
  ): Promise<Record<string, unknown>> {
    // MS Teams endpoints - fetch Bot Framework token
    if (endpoint.type === ENDPOINT_TYPES.MS_TEAMS_CHANNEL || endpoint.type === ENDPOINT_TYPES.MS_TEAMS_USER) {
      return await this.extractMsTeamsToken(endpoint, connectionMap);
    }

    if (
      endpoint.type === ENDPOINT_TYPES.SLACK_CHANNEL ||
      endpoint.type === ENDPOINT_TYPES.SLACK_USER ||
      endpoint.type === ENDPOINT_TYPES.WEBEX_ROOM ||
      endpoint.type === ENDPOINT_TYPES.WEBEX_PERSON
    ) {
      return await this.extractRotatingConnectionToken(endpoint, connectionMap);
    }

    const endpointStoredSecretConfig = ENDPOINT_STORED_SECRET_CONFIGS[endpoint.type];
    if (endpointStoredSecretConfig) {
      return this.extractEndpointStoredSecrets(endpoint, endpointStoredSecretConfig);
    }

    // Other connection-based tokens
    const token = this.extractConnectionToken(endpoint, connectionMap);
    return { token: token || '' };
  }

  /**
   * Decrypts tool routing secrets from `ChannelEndpoint.endpoint` and returns
   * an `endpoint` override so `buildChannelData`'s spread replaces the
   * encrypted stored document with the plaintext wire shape providers read.
   * `requiredFields` must all be present or the whole endpoint is rejected.
   */
  private extractEndpointStoredSecrets(
    endpoint: ChannelEndpointEntity,
    config: EndpointStoredSecretConfig
  ): Record<string, unknown> {
    const { providerLabel, requiredFields } = config;
    const decrypted = decryptChannelEndpoint(endpoint.type, endpoint.endpoint);
    const decryptedFields = decrypted as Record<string, unknown>;

    if (requiredFields.some((field) => !decryptedFields[field])) {
      throw new Error(`${providerLabel} endpoint ${endpoint.identifier} is missing ${requiredFields.join(' or ')}`);
    }

    return { endpoint: decrypted };
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
   * Extracts the bot token from the linked connection for providers with rotating OAuth
   * tokens (Slack, Webex), refreshing it first when the app uses token rotation
   * (refreshToken + expiresAt persisted by the OAuth callback).
   */
  private async extractRotatingConnectionToken(
    endpoint: ChannelEndpointEntity,
    connectionMap: Map<string, ChannelConnectionEntity>
  ): Promise<Record<string, unknown>> {
    const connection = endpoint.connectionIdentifier ? connectionMap.get(endpoint.connectionIdentifier) : undefined;

    if (!connection?.auth) {
      return { token: '' };
    }

    const token = await this.rotatingConnectionTokenService.getConnectionToken(connection);

    return { token: token || '' };
  }

  /**
   * Extracts a plain OAuth access token from the linked connection (fallback for
   * endpoint types without dedicated token handling).
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
}
