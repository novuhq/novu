import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export interface AgentBehavior {
  acknowledgeOnReceived?: boolean;
  reactionOnResolved?: string | null;
}

export enum AgentRuntimeEnum {
  BRIDGE = 'bridge',
  CLAUDE_MANAGED = 'claude_managed',
}

export type AgentMcpServerAuthType = 'oauth' | 'static_bearer' | 'none';

export type AgentMcpServerScope = 'shared' | 'per_subscriber';

/**
 * Snapshot of a catalog entry attached to an agent. Stored on the agent so that
 * later catalog changes (renames, URL moves) don't break already-provisioned
 * Anthropic agents that reference these names.
 */
export interface AgentMcpServer {
  /** Catalog id (e.g. "github"). Used as the Anthropic mcp_server_name. */
  name: string;
  /** Display name shown in the dashboard. */
  displayName: string;
  /** HTTPS MCP server URL. */
  url: string;
  authType: AgentMcpServerAuthType;
  /** 'shared' = one org-level vault credential; 'per_subscriber' = one per subscriber. */
  scope: AgentMcpServerScope;
  /** OAuth provider key — only present when authType === 'oauth'. */
  oauthProvider?: string;
}

export interface AgentManagedRuntime {
  provider: 'anthropic';
  agentId: string;
  environmentId: string;
  /** @deprecated kept for back-compat; replaced by per-subscriber and org vault lookups. */
  vaultIds?: string[];
  /** MCP servers this agent connects to. Mirrors Anthropic's mcp_servers array. */
  mcpServers?: AgentMcpServer[];
}

export class AgentEntity {
  _id: string;

  name: string;

  identifier: string;

  description?: string;

  active: boolean;

  behavior?: AgentBehavior;

  runtime?: AgentRuntimeEnum;

  managedRuntime?: AgentManagedRuntime;

  bridgeUrl?: string;

  devBridgeUrl?: string;

  devBridgeActive?: boolean;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  createdAt: string;

  updatedAt: string;
}

export type AgentDBModel = ChangePropsValueType<AgentEntity, '_environmentId' | '_organizationId'>;
