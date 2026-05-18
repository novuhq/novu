import { AgentRuntimeProviderIdEnum } from '../../types/providers';

export type AgentRuntime = 'self-hosted' | 'managed';

/**
 * Identifies which section of the Novu Dashboard was used to create the agent.
 * - `'platform'` – created from the standard Platform section (default).
 * - `'connect'` – created from the Connect section.
 */
export enum AgentCreationSourceEnum {
  PLATFORM = 'platform',
  CONNECT = 'connect',
}

export type ManagedRuntimeConfigDto = {
  /** The agent-runtime provider (e.g. 'anthropic') */
  providerId: AgentRuntimeProviderIdEnum;
  /** Internal Novu Integration._id that holds the encrypted API key */
  integrationId: string;
  /** The agent entity ID returned by the provider when the agent was provisioned */
  externalAgentId: string;
};

export type AgentSkillDto = {
  /** 'anthropic' for Anthropic-managed skills, 'custom' for user-created skills */
  type: 'anthropic' | 'custom';
  /** Skill identifier, e.g. "xlsx" for Anthropic skills or "skill_01XJ5..." for custom */
  skillId: string;
  /** Version to pin. Omit to use latest. */
  version?: string | null;
};

/**
 * Payload shape used when creating a new managed-runtime agent.
 * The integration (holding the encrypted API key and provisioned provider environment)
 * must be created first via POST /integrations with kind 'agent'.
 */
export type CreateManagedRuntimeDto = {
  providerId: AgentRuntimeProviderIdEnum;
  /** ID of an existing Novu integration that holds the provider API key and environment. */
  integrationId: string;
  model?: string;
  systemPrompt?: string;
  /** Tool `type` strings to enable on the new agent (e.g. 'web_search'). */
  tools?: string[];
  /** MCP server IDs to attach to the new agent (must match McpServer.id). */
  mcpServers?: string[];
  /** Skills to attach to the new agent. Maximum 20. */
  skills?: AgentSkillDto[];
};

/**
 * Subset of agent runtime config fetched live from the provider.
 * Nothing here is persisted in Novu's database.
 */
export type AgentRuntimeConfigDto = {
  model: string;
  systemPrompt: string;
  mcpServers: AgentMcpServerDto[];
  tools: AgentToolDto[];
  skills: AgentSkillDto[];
};

export type AgentMcpServerDto = {
  /** Provider-assigned ID for the MCP server */
  externalId: string;
  name: string;
  url: string;
};

/**
 * Scope tier for an MCP OAuth connection. Mirrors `McpConnectionEntity.scope`
 * in `@novu/dal`. Only `agent_mcp_subscriber` is implemented in v1; the
 * remaining tiers are reserved for future shared-token flows.
 */
export enum McpConnectionScopeEnum {
  Environment = 'environment',
  AgentMcp = 'agent_mcp',
  AgentMcpSubscriber = 'agent_mcp_subscriber',
}

/**
 * Where the OAuth secret for an MCP connection lives.
 *
 * - `novu` — Novu stores encrypted access/refresh tokens itself.
 * - `none` — MCP requires no auth.
 */
export enum McpConnectionAuthModeEnum {
  Novu = 'novu',
  None = 'none',
}

export enum McpConnectionStatusEnum {
  PendingOAuth = 'pending_oauth',
  Connected = 'connected',
  Expired = 'expired',
  Revoked = 'revoked',
  Error = 'error',
}

export type McpConnectionDto = {
  /** Mongo `_id` of the underlying `mcp_connection` row. */
  id: string;
  /** Catalog id (`McpServer.id`). */
  mcpId: string;
  scope: McpConnectionScopeEnum;
  authMode: McpConnectionAuthModeEnum;
  status: McpConnectionStatusEnum;
  /** Mongo `_id` of the parent `agent_mcp_server` row when scope >= agent_mcp. */
  agentMcpServerId?: string;
  /** Mongo `Subscriber._id` when scope === `agent_mcp_subscriber`. */
  subscriberId?: string;
  expiresAt?: string;
  connectedAt?: string;
};

/**
 * Per-agent enablement record for an MCP from the catalog.
 * Returned by the new `/agents/:id/mcp-servers` endpoints.
 */
export type AgentMcpServerEnablementDto = {
  id: string;
  /** Catalog id (`McpServer.id`). */
  mcpId: string;
  enabled: boolean;
  defaultScope: McpConnectionScopeEnum;
  defaultAuthMode: McpConnectionAuthModeEnum;
  status: 'active' | 'syncing' | 'error' | 'disabled';
};

export type AgentToolDto = {
  /** Provider-assigned ID for the tool */
  externalId: string;
  name: string;
  type: 'builtin' | 'custom';
  description?: string;
};
