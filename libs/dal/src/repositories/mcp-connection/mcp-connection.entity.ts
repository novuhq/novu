import type { AgentRuntimeProviderIdEnum } from '@novu/shared';

import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

/**
 * Scope tier for an `mcp_connection` row. Determines which owner ref fields
 * are populated on the row. v1 only writes `agent_mcp_subscriber`; the other
 * tiers are reserved for future shared-token flows.
 */
export type McpConnectionScope = 'environment' | 'agent_mcp' | 'agent_mcp_subscriber';

/**
 * - `novu`     — Novu owns the secret. Encrypted access/refresh tokens live
 *                in the `auth` blob.
 * - `provider` — The runtime provider (e.g. Anthropic Vault) owns the secret.
 *                We only store an opaque `providerRef.vaultId` mapping.
 * - `none`     — Anonymous MCP, no auth needed.
 */
export type McpConnectionAuthMode = 'novu' | 'provider' | 'none';

export type McpConnectionStatus = 'pending_oauth' | 'connected' | 'expired' | 'revoked' | 'error';

export interface McpConnectionAuth {
  /** Encrypted access token (use decryptMcpConnectionAuth at read-time). */
  accessToken?: string;
  /** Encrypted refresh token (use decryptMcpConnectionAuth at read-time). */
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scopes?: string[];
}

export interface McpConnectionProviderRef {
  providerId: AgentRuntimeProviderIdEnum;
  /** Opaque pointer to the entry in the provider's vault (e.g. Anthropic Vault). */
  vaultId: string;
  metadata?: Record<string, unknown>;
}

export interface McpConnectionOAuthState {
  /** Optional PKCE verifier kept while the OAuth flow is in flight. */
  pkceVerifier?: string;
  initiatedAt: Date;
  /** Soft deadline used to expire abandoned OAuth flows during cleanup. */
  expectedRedirectAt?: Date;
}

export interface McpConnectionLastError {
  code: string;
  message: string;
  at: Date;
}

/**
 * OAuth state for a (scope, mcp, owner) tuple.
 *
 * Either `auth` (novu mode) OR `providerRef` (provider mode) is populated
 * once `status === 'connected'`. Owner ref fields populated by scope:
 *
 *  - `environment`            : `_environmentId` only (future).
 *  - `agent_mcp`              : `_agentMcpServerId` (future).
 *  - `agent_mcp_subscriber`   : `_agentMcpServerId` + `_subscriberId` (v1).
 */
export class McpConnectionEntity {
  _id: string;

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  scope: McpConnectionScope;

  /** Catalog id from `CLAUDE_MCP_SERVERS` (e.g. 'slack'). */
  mcpId: string;

  /** FK to `agent_mcp_server` for `agent_mcp` and `agent_mcp_subscriber` scopes. */
  _agentMcpServerId?: string;

  /** Mongo `Subscriber._id` (not the external `subscriberId` string). */
  _subscriberId?: string;

  authMode: McpConnectionAuthMode;

  status: McpConnectionStatus;

  /** Populated when `authMode === 'novu'`. */
  auth?: McpConnectionAuth;

  /** Populated when `authMode === 'provider'`. */
  providerRef?: McpConnectionProviderRef;

  /** Cleared once `status` transitions out of `pending_oauth`. */
  oauthState?: McpConnectionOAuthState;

  lastError?: McpConnectionLastError;

  connectedAt?: Date;

  createdAt: string;

  updatedAt: string;
}

export type McpConnectionDBModel = ChangePropsValueType<McpConnectionEntity, '_environmentId' | '_organizationId'>;
