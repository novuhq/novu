import type { AgentRuntimeProviderIdEnum } from '@novu/shared';

import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

/**
 * Default authorization scope for an MCP enabled on an agent.
 *
 * Only `subscriber` is implemented in v1. The other values are reserved for
 * future tiers (per-environment shared token, per-(agent, mcp) shared token)
 * so the field is forward-compatible without a migration.
 */
export type AgentMcpServerScope = 'environment' | 'agent' | 'subscriber';

/**
 * Default authentication mode for connections created under this enabled
 * MCP. `provider` is reserved for runtimes that own their own token vault
 * (e.g. Anthropic); `novu` keeps the encrypted token in Novu; `none` is
 * for unauthenticated MCPs.
 */
export type AgentMcpServerAuthMode = 'novu' | 'provider' | 'none';

export type AgentMcpServerStatus = 'active' | 'syncing' | 'error' | 'disabled';

export interface AgentMcpServerExternalProjection {
  /** Provider that owns the projection (e.g. Anthropic). */
  providerId: AgentRuntimeProviderIdEnum;
  /** Name used to identify this MCP on the provider's agent resource. */
  mcpServerName: string;
  /** When the projection was last successfully written. */
  syncedAt: Date;
}

export interface AgentMcpServerLastError {
  code: string;
  message: string;
  at: Date;
}

/**
 * Per-agent enablement record for an MCP server from the catalog.
 *
 * Mongo is the source of truth for the list of MCPs enabled on an agent.
 * The provider-side `agent.mcp_servers` collection is treated as a downstream
 * projection that we sync on every write to this collection.
 */
export class AgentMcpServerEntity {
  _id: string;

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  _agentId: string;

  /** Catalog id from `MCP_SERVERS` (e.g. 'slack'). */
  mcpId: string;

  enabled: boolean;

  defaultScope: AgentMcpServerScope;

  defaultAuthMode: AgentMcpServerAuthMode;

  externalProjection?: AgentMcpServerExternalProjection;

  status: AgentMcpServerStatus;

  lastError?: AgentMcpServerLastError;

  createdAt: string;

  updatedAt: string;
}

export type AgentMcpServerDBModel = ChangePropsValueType<
  AgentMcpServerEntity,
  '_agentId' | '_environmentId' | '_organizationId'
>;
