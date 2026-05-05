import type { ChannelTypeEnum, DirectionEnum, IEnvironment } from '@novu/shared';
import { del, get, patch, post, put } from '@/api/api.client';

/** Root segment for TanStack Query keys; use with {@link getAgentsListQueryKey}. */
export const AGENTS_LIST_QUERY_KEY = 'fetchAgents' as const;

const AGENT_DETAIL_QUERY_KEY = 'fetchAgent' as const;

const AGENT_INTEGRATIONS_QUERY_KEY = 'fetchAgentIntegrations' as const;

const AGENT_EMOJI_QUERY_KEY = 'fetchAgentEmoji' as const;

const CLAUDE_AGENT_CREDENTIALS_QUERY_KEY = 'fetchClaudeAgentCredentials' as const;

const MCP_CATALOG_QUERY_KEY = 'fetchMcpCatalog' as const;

const SHARED_MCP_CREDENTIALS_QUERY_KEY = 'fetchSharedMcpCredentials' as const;

const SUBSCRIBER_MCP_CONNECTIONS_QUERY_KEY = 'fetchSubscriberMcpConnections' as const;

export function getAgentDetailQueryKey(environmentId: string | undefined, identifier: string | undefined) {
  return [AGENT_DETAIL_QUERY_KEY, environmentId, identifier] as const;
}

export function getAgentIntegrationsQueryKey(environmentId: string | undefined, agentIdentifier: string | undefined) {
  return [AGENT_INTEGRATIONS_QUERY_KEY, environmentId, agentIdentifier] as const;
}

export function getAgentsListQueryKey(
  environmentId: string | undefined,
  params: { after?: string; before?: string; limit: number; identifier: string }
) {
  return [AGENTS_LIST_QUERY_KEY, environmentId, params] as const;
}

export type AgentIntegrationSummary = {
  integrationId: string;
  providerId: string;
  name: string;
  identifier: string;
  channel: ChannelTypeEnum;
  active: boolean;
};

export type AgentBehavior = {
  acknowledgeOnReceived?: boolean;
  reactionOnResolved?: string | null;
};

export type AgentRuntime = 'bridge' | 'claude_managed';

export type AgentMcpServerAuthType = 'oauth' | 'static_bearer' | 'none';

export type AgentMcpServerScope = 'shared' | 'per_subscriber';

export type AgentMcpServer = {
  /** Catalog id (e.g. "github"). */
  name: string;
  displayName: string;
  url: string;
  authType: AgentMcpServerAuthType;
  scope: AgentMcpServerScope;
  oauthProvider?: string;
};

export type McpCatalogEntry = AgentMcpServer & {
  description: string;
};

export type AgentManagedRuntime = {
  provider: 'anthropic';
  agentId: string;
  environmentId: string;
  vaultIds?: string[];
  mcpServers?: AgentMcpServer[];
};

export const AGENT_TOOL_NAMES = ['bash', 'edit', 'read', 'write', 'glob', 'grep', 'web_fetch', 'web_search'] as const;

export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

export type AgentToolToggle = {
  name: AgentToolName;
  enabled: boolean;
};

export type AgentMcpServerSelection = {
  /** Catalog id, e.g. "github". */
  id: string;
};

export type CreateManagedRuntimeSetup = {
  mode: 'create';
  apiKey?: string;
  system: string;
  tools?: AgentToolToggle[];
  mcpServers?: AgentMcpServerSelection[];
};

export type ExistingManagedRuntimeSetup = {
  mode: 'existing';
  provider: 'anthropic';
  agentId: string;
  environmentId: string;
  vaultIds?: string[];
  mcpServers?: AgentMcpServerSelection[];
};

export type ManagedRuntimeSetup = CreateManagedRuntimeSetup | ExistingManagedRuntimeSetup;

export type AgentResponse = {
  _id: string;
  name: string;
  identifier: string;
  description?: string;
  active: boolean;
  behavior?: AgentBehavior;
  runtime: AgentRuntime;
  managedRuntime?: AgentManagedRuntime;
  bridgeUrl?: string;
  devBridgeUrl?: string;
  devBridgeActive?: boolean;
  _environmentId: string;
  _organizationId: string;
  createdAt: string;
  updatedAt: string;
  integrations?: AgentIntegrationSummary[];
};

export type ListAgentsResponse = {
  data: AgentResponse[];
  next: string | null;
  previous: string | null;
  totalCount: number;
  totalCountCapped: boolean;
};

export type CreateAgentBody = {
  name: string;
  identifier: string;
  description?: string;
  active?: boolean;
  runtime?: AgentRuntime;
  managedRuntime?: ManagedRuntimeSetup;
};

export type UpdateAgentBody = {
  name?: string;
  description?: string;
  active?: boolean;
  behavior?: AgentBehavior;
  runtime?: AgentRuntime;
  managedRuntime?: AgentManagedRuntime;
  bridgeUrl?: string;
  devBridgeUrl?: string;
  devBridgeActive?: boolean;
};

export type ListAgentsParams = {
  environment: IEnvironment;
  limit?: number;
  after?: string;
  before?: string;
  orderBy?: 'createdAt' | 'updatedAt' | '_id';
  orderDirection?: DirectionEnum;
  identifier?: string;
  signal?: AbortSignal;
};

function buildAgentsQuery(params: ListAgentsParams): string {
  const searchParams = new URLSearchParams();

  if (params.limit != null) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.after) {
    searchParams.set('after', params.after);
  }

  if (params.before) {
    searchParams.set('before', params.before);
  }

  if (params.orderBy) {
    searchParams.set('orderBy', params.orderBy);
  }

  if (params.orderDirection) {
    searchParams.set('orderDirection', params.orderDirection);
  }

  if (params.identifier) {
    searchParams.set('identifier', params.identifier);
  }

  const qs = searchParams.toString();

  return qs ? `?${qs}` : '';
}

export function listAgents(params: ListAgentsParams): Promise<ListAgentsResponse> {
  const query = buildAgentsQuery(params);

  return get<ListAgentsResponse>(`/agents${query}`, {
    environment: params.environment,
    signal: params.signal,
  });
}

type AgentApiEnvelope = { data: AgentResponse };

export async function getAgent(
  environment: IEnvironment,
  identifier: string,
  signal?: AbortSignal
): Promise<AgentResponse> {
  const response = await get<AgentApiEnvelope>(`/agents/${encodeURIComponent(identifier)}`, {
    environment,
    signal,
  });

  return response.data;
}

export async function createAgent(environment: IEnvironment, body: CreateAgentBody): Promise<AgentResponse> {
  const response = await post<AgentApiEnvelope>('/agents', { environment, body });

  return response.data;
}

export async function updateAgent(
  environment: IEnvironment,
  identifier: string,
  body: UpdateAgentBody
): Promise<AgentResponse> {
  const response = await patch<AgentApiEnvelope>(`/agents/${encodeURIComponent(identifier)}`, { environment, body });

  return response.data;
}

export function deleteAgent(environment: IEnvironment, identifier: string): Promise<void> {
  return del(`/agents/${encodeURIComponent(identifier)}`, { environment });
}

/** Picked integration fields on an agent–integration link (matches API `integration`). */
export type AgentIntegrationEmbedded = {
  _id: string;
  identifier: string;
  name: string;
  providerId: string;
  channel: ChannelTypeEnum;
  active: boolean;
};

/** Agent–integration link row returned by GET /agents/:identifier/integrations */
export type AgentIntegrationLink = {
  _id: string;
  _agentId: string;
  integration: AgentIntegrationEmbedded;
  _environmentId: string;
  _organizationId: string;
  connectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListAgentIntegrationsResponse = {
  data: AgentIntegrationLink[];
  next: string | null;
  previous: string | null;
  totalCount: number;
  totalCountCapped: boolean;
};

export type ListAgentIntegrationsParams = {
  environment: IEnvironment;
  agentIdentifier: string;
  limit?: number;
  signal?: AbortSignal;
};

function buildAgentIntegrationsQuery(params: ListAgentIntegrationsParams): string {
  const searchParams = new URLSearchParams();

  if (params.limit != null) {
    searchParams.set('limit', String(params.limit));
  }

  const qs = searchParams.toString();

  return qs ? `?${qs}` : '';
}

export function listAgentIntegrations(params: ListAgentIntegrationsParams): Promise<ListAgentIntegrationsResponse> {
  const query = buildAgentIntegrationsQuery(params);

  return get<ListAgentIntegrationsResponse>(
    `/agents/${encodeURIComponent(params.agentIdentifier)}/integrations${query}`,
    {
      environment: params.environment,
      signal: params.signal,
    }
  );
}

export type AddAgentIntegrationBody = {
  integrationIdentifier?: string;
  providerId?: string;
};

type AgentIntegrationLinkEnvelope = { data: AgentIntegrationLink };

export async function addAgentIntegration(
  environment: IEnvironment,
  agentIdentifier: string,
  body: AddAgentIntegrationBody
): Promise<AgentIntegrationLink> {
  const response = await post<AgentIntegrationLinkEnvelope>(
    `/agents/${encodeURIComponent(agentIdentifier)}/integrations`,
    { environment, body }
  );

  return response.data;
}

export function removeAgentIntegration(
  environment: IEnvironment,
  agentIdentifier: string,
  agentIntegrationId: string
): Promise<void> {
  return del(`/agents/${encodeURIComponent(agentIdentifier)}/integrations/${encodeURIComponent(agentIntegrationId)}`, {
    environment,
  });
}

export async function sendAgentTestEmail(
  environment: IEnvironment,
  agentIdentifier: string,
  targetAddress: string
): Promise<{ success: boolean }> {
  return post<{ success: boolean }>(`/agents/${encodeURIComponent(agentIdentifier)}/test-email`, {
    environment,
    body: { targetAddress },
  });
}

export type AgentEmojiEntry = {
  name: string;
  unicode: string;
};

export function getAgentEmojiQueryKey() {
  return [AGENT_EMOJI_QUERY_KEY] as const;
}

export async function listAgentEmoji(environment: IEnvironment, signal?: AbortSignal): Promise<AgentEmojiEntry[]> {
  const response = await get<{ data: AgentEmojiEntry[] }>('/agents/emoji', { environment, signal });

  return response.data;
}

export function getClaudeAgentCredentialsQueryKey(environmentId: string | undefined) {
  return [CLAUDE_AGENT_CREDENTIALS_QUERY_KEY, environmentId] as const;
}

export type ClaudeAgentCredentialsResponse = {
  configured: boolean;
};

export async function getClaudeAgentCredentials(
  environment: IEnvironment,
  signal?: AbortSignal
): Promise<ClaudeAgentCredentialsResponse> {
  const response = await get<{ data: ClaudeAgentCredentialsResponse }>('/agents/claude/credentials', {
    environment,
    signal,
  });

  return response.data;
}

export async function updateClaudeAgentCredentials(
  environment: IEnvironment,
  apiKey: string
): Promise<ClaudeAgentCredentialsResponse> {
  const response = await put<{ data: ClaudeAgentCredentialsResponse }>('/agents/claude/credentials', {
    environment,
    body: { apiKey },
  });

  return response.data;
}

export async function testClaudeManagedAgent(
  environment: IEnvironment,
  agentIdentifier: string
): Promise<{ success: boolean }> {
  const response = await post<{ data: { success: boolean } }>(
    `/agents/${encodeURIComponent(agentIdentifier)}/claude/test`,
    {
      environment,
    }
  );

  return response.data;
}

export function getMcpCatalogQueryKey() {
  return [MCP_CATALOG_QUERY_KEY] as const;
}

export async function listMcpCatalog(environment: IEnvironment, signal?: AbortSignal): Promise<McpCatalogEntry[]> {
  const response = await get<{ data: McpCatalogEntry[] }>('/agents/mcp/catalog', { environment, signal });

  return response.data;
}

export async function updateAgentMcpServers(
  environment: IEnvironment,
  agentIdentifier: string,
  mcpServers: AgentMcpServerSelection[]
): Promise<AgentResponse> {
  const response = await put<AgentApiEnvelope>(`/agents/${encodeURIComponent(agentIdentifier)}/claude/mcp`, {
    environment,
    body: { mcpServers },
  });

  return response.data;
}

export type SharedMcpCredentialStatus = {
  mcpServerName: string;
  displayName: string;
  configured: boolean;
};

export function getSharedMcpCredentialsQueryKey(environmentId: string | undefined) {
  return [SHARED_MCP_CREDENTIALS_QUERY_KEY, environmentId] as const;
}

export async function listSharedMcpCredentials(
  environment: IEnvironment,
  signal?: AbortSignal
): Promise<SharedMcpCredentialStatus[]> {
  const response = await get<{ data: SharedMcpCredentialStatus[] }>('/agents/claude/mcp/credentials/shared', {
    environment,
    signal,
  });

  return response.data;
}

export async function setSharedMcpCredential(
  environment: IEnvironment,
  body: { mcpServerName: string; token: string }
): Promise<{ configured: boolean }> {
  const response = await put<{ data: { configured: boolean } }>('/agents/claude/mcp/credentials/shared', {
    environment,
    body,
  });

  return response.data;
}

export function removeSharedMcpCredential(environment: IEnvironment, mcpServerName: string): Promise<void> {
  return del(`/agents/claude/mcp/credentials/shared/${encodeURIComponent(mcpServerName)}`, { environment });
}

export type SubscriberMcpConnectionStatus = {
  mcpServerName: string;
  displayName: string;
  status: 'not_connected' | 'connected' | 'expired' | 'failed';
  connectedAt?: string;
  lastUsedAt?: string;
};

export function getSubscriberMcpConnectionsQueryKey(
  environmentId: string | undefined,
  agentIdentifier: string | undefined,
  subscriberId: string | undefined
) {
  return [SUBSCRIBER_MCP_CONNECTIONS_QUERY_KEY, environmentId, agentIdentifier, subscriberId] as const;
}

export async function listSubscriberMcpConnections(
  environment: IEnvironment,
  agentIdentifier: string,
  subscriberId: string,
  signal?: AbortSignal
): Promise<SubscriberMcpConnectionStatus[]> {
  const response = await get<{ data: SubscriberMcpConnectionStatus[] }>(
    `/agents/${encodeURIComponent(agentIdentifier)}/mcp/connections/${encodeURIComponent(subscriberId)}`,
    { environment, signal }
  );

  return response.data;
}

export function disconnectSubscriberMcp(
  environment: IEnvironment,
  agentIdentifier: string,
  subscriberId: string,
  mcpServerName: string
): Promise<void> {
  return del(
    `/agents/${encodeURIComponent(agentIdentifier)}/mcp/connections/${encodeURIComponent(subscriberId)}/${encodeURIComponent(mcpServerName)}`,
    { environment }
  );
}
