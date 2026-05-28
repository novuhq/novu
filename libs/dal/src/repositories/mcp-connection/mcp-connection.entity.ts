import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

/**
 * Scope tier for an `mcp_connection` row. Determines which owner ref fields
 * are populated on the row. v1 only writes `subscriber`; the other tiers are
 * reserved for future shared-token flows.
 */
export type McpConnectionScope = 'environment' | 'agent' | 'subscriber';

/**
 * OAuth mechanism the connection was established with. Mirrors the catalog
 * `mode` for the MCP — each MCP supports exactly one mechanism.
 *
 * - `dcr`      — Dynamic Client Registration (RFC 7591). A fresh OAuth client
 *                is registered per subscriber against the upstream AS.
 *                Encrypted access/refresh tokens live in the `auth` blob and
 *                the registered client lives in `oauthClient`.
 * - `novu-app` — Novu's single pre-registered OAuth application is used.
 *                `client_id` / `client_secret` come from server env vars.
 * - `user-app` — The Novu customer's own pre-registered OAuth application is
 *                used. Credentials come from a per-org credential table.
 */
export type McpConnectionAuthMode = 'dcr' | 'novu-app' | 'user-app';

export type McpConnectionStatus = 'pending_oauth' | 'connected' | 'expired' | 'revoked' | 'error';

export interface McpConnectionAuth {
  /** Encrypted access token (use decryptMcpConnectionAuth at read-time). */
  accessToken?: string;
  /** Encrypted refresh token (use decryptMcpConnectionAuth at read-time). */
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  scopes?: string[];
  /**
   * Stable identifier returned by the agent-runtime provider's vault when the
   * credential was pushed there (only set when `capabilities.tokenVault ===
   * true`). Used to target the same credential on refresh / disable.
   */
  vaultCredentialId?: string;
  /**
   * Anthropic vault container (`vlt_…`) that owns this subscriber's MCP
   * credentials for this agent. All subscriber-scoped rows for the same
   * `(subscriber, agent)` share one vault id, propagated whenever a new MCP
   * row is opened. v1 only writes subscriber-scope rows; agent-scope is
   * reserved for a future shared-token flow.
   */
  externalVaultId?: string;
}

export interface McpConnectionOAuthState {
  /** Optional PKCE verifier kept while the OAuth flow is in flight. */
  pkceVerifier?: string;
  initiatedAt: Date;
  /**
   * Authorization-server `issuer` recorded at authorize-URL time per RFC 9207.
   * On callback, the `iss` query parameter (when emitted) must equal this
   * value by simple string comparison; mismatches reject the response.
   */
  expectedIssuer?: string;
  /**
   * Canonical MCP resource URI recorded at authorize-URL time per RFC 8707
   * so the token request can replay the same `resource` value even after the
   * AS-metadata cache evicts.
   */
  resource?: string;
  /**
   * One-shot OAuth callback claim. Set by the callback usecase during the
   * atomic `findOneAndUpdate` that gates token exchange so concurrent
   * callbacks for the same signed `state` can't both swap an authorization
   * code for tokens. The presence of this field acts as the exclusive
   * marker; subsequent callbacks see the row no longer matches the
   * `callbackClaimedAt: { $exists: false }` filter and bail out.
   */
  callbackClaimedAt?: Date;
  /**
   * `novu-app` mode only: authorization-server `token_endpoint` copied from
   * the catalog at authorize time so the callback can exchange the
   * authorization code without re-consulting the catalog and without
   * persisting a long-lived `oauthClient` row. Absent for DCR rows (the
   * token endpoint lives on `oauthClient.tokenEndpoint`).
   */
  tokenEndpoint?: string;
  /**
   * `novu-app` mode only: authorization-server `authorization_endpoint`
   * copied from the catalog at authorize time for parity with
   * `tokenEndpoint`. Kept on the row so the callback can reconstruct an
   * ephemeral `McpConnectionOAuthClient` for vault push.
   */
  authorizationEndpoint?: string;
}

/**
 * OAuth client credentials persisted across re-consents for a (subscriber, mcp)
 * pair. Populated by the MCP-spec Dynamic Client Registration flow (RFC 7591).
 *
 * Survives `status` transitions out of `pending_oauth` so a reconnect can reuse
 * the registered client without re-hitting the upstream `/register` endpoint.
 * Only cleared when (a) the recorded `issuer` no longer matches PRM discovery,
 * (b) `clientSecretExpiresAt` has lapsed, or (c) the catalog entry is removed.
 */
export interface McpConnectionOAuthClient {
  /** Client identifier issued by the upstream authorization server. */
  clientId: string;
  /** Encrypted client secret (use `decryptMcpConnectionAuth` at read-time). */
  clientSecret?: string;
  /**
   * RFC 7591 `client_secret_expires_at`. Absent/0 = non-expiring; a Date in
   * the past triggers re-registration on next authorize-URL request.
   */
  clientSecretExpiresAt?: Date;
  /** Encrypted RFC 7592 registration access token, when issued by the AS. */
  registrationAccessToken?: string;
  /** RFC 7592 client configuration endpoint URI, when issued. */
  registrationClientUri?: string;
  /** Authorization-server issuer recorded for spoof-detection on reuse. */
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  registrationEndpoint?: string;
  /** Scopes requested at registration time. */
  scopesGranted?: string[];
  registeredAt: Date;
}

export interface McpConnectionLastError {
  code: string;
  message: string;
  at: Date;
}

export type McpToolTrustPolicy = 'always_ask' | 'always_allow';

export const DEFAULT_MCP_TOOL_TRUST_POLICY: McpToolTrustPolicy = 'always_ask';

export type McpToolTrust = {
  /** Applies to all tools from this MCP server for this subscriber. */
  serverDefault?: McpToolTrustPolicy;
  /** Per-tool overrides keyed by MCP tool name (e.g. "list_issues"). */
  tools?: Record<string, McpToolTrustPolicy>;
};

/**
 * OAuth state for a (scope, mcp, owner) tuple.
 *
 * `auth` is populated when `status === 'connected'` — the access/refresh
 * tokens it carries belong to whichever client the `authMode` indicates
 * (DCR-issued, Novu's pre-registered app, or the customer's pre-registered
 * app). Owner ref fields populated by scope:
 *
 *  - `environment` : `_environmentId` only (future).
 *  - `agent`       : `_agentMcpServerId` (future).
 *  - `subscriber`  : `_agentMcpServerId` + `_subscriberId` (v1).
 *
 * For `authMode === 'novu-app'` rows, `auth.expiresAt` is advisory only —
 * the Anthropic agent runtime vault is the source of truth for the bearer
 * token's lifetime and the refresh schedule.
 */
export class McpConnectionEntity {
  _id: string;

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  scope: McpConnectionScope;

  /** Catalog id from `MCP_SERVERS` (e.g. 'slack'). */
  mcpId: string;

  /** FK to `agent_mcp_server` for `agent` and `subscriber` scopes. */
  _agentMcpServerId?: string;

  /** Mongo `Subscriber._id` (not the external `subscriberId` string). */
  _subscriberId?: string;

  authMode: McpConnectionAuthMode;

  status: McpConnectionStatus;

  /** Populated when `status === 'connected'`. Encrypted token blob. */
  auth?: McpConnectionAuth;

  /** Cleared once `status` transitions out of `pending_oauth`. */
  oauthState?: McpConnectionOAuthState;

  /**
   * DCR-issued OAuth client credentials + discovered AS endpoints. Populated
   * only when `authMode === 'dcr'`. Survives re-consents; only re-registered
   * when the upstream issuer rotates or the client secret expires. Absent
   * for `novu-app` and `user-app` connections — those modes load credentials
   * from env vars / per-org config at request time instead.
   */
  oauthClient?: McpConnectionOAuthClient;

  lastError?: McpConnectionLastError;

  /** Subscriber-scoped auto-approve prefs for MCP tool calls. */
  toolTrust?: McpToolTrust;

  connectedAt?: string;

  createdAt: string;

  updatedAt: string;
}

export type McpConnectionDBModel = ChangePropsValueType<McpConnectionEntity, '_environmentId' | '_organizationId'>;
