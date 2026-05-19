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
 * - `novu`     — Novu owns the secret. Encrypted access/refresh tokens live
 *                in the `auth` blob.
 * - `provider` — The runtime provider's own vault owns the secret; we hold
 *                only a `vaultCredentialId` pointer in `auth`.
 * - `none`     — Anonymous MCP, no auth needed.
 */
export type McpConnectionAuthMode = 'novu' | 'provider' | 'none';

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
}

export interface McpConnectionOAuthState {
  /** Optional PKCE verifier kept while the OAuth flow is in flight. */
  pkceVerifier?: string;
  initiatedAt: Date;
  /** Soft deadline used to expire abandoned OAuth flows during cleanup. */
  expectedRedirectAt?: Date;
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

/**
 * A managed-agent turn that failed because the upstream MCP couldn't be
 * initialised (no credential in the provider vault). The worker parks the
 * full job payload here so the OAuth callback can re-enqueue it once the
 * subscriber finishes the DCR flow. Cleared when re-enqueued; expires via
 * the schema-level TTL index when the user abandons the flow.
 *
 * `jobData` is intentionally typed loosely — `libs/dal` cannot depend on
 * `libs/application-generic` (where `IManagedAgentJobData` lives), and the
 * DAL has no reason to validate the queue payload shape. The parking
 * usecase enforces the shape before this is persisted.
 */
export interface McpConnectionPendingTurn {
  jobData: Record<string, unknown>;
  queuedAt: Date;
}

/**
 * OAuth state for a (scope, mcp, owner) tuple.
 *
 * `auth` is populated when `authMode === 'novu'` and `status === 'connected'`.
 * Owner ref fields populated by scope:
 *
 *  - `environment` : `_environmentId` only (future).
 *  - `agent`       : `_agentMcpServerId` (future).
 *  - `subscriber`  : `_agentMcpServerId` + `_subscriberId` (v1).
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

  /** Populated when `authMode === 'novu'`. */
  auth?: McpConnectionAuth;

  /** Cleared once `status` transitions out of `pending_oauth`. */
  oauthState?: McpConnectionOAuthState;

  /**
   * DCR-issued OAuth client credentials + discovered AS endpoints. Survives
   * re-consents; only re-registered when the upstream issuer rotates or the
   * client secret expires.
   */
  oauthClient?: McpConnectionOAuthClient;

  lastError?: McpConnectionLastError;

  /**
   * Failed managed-agent turn waiting to be replayed after the subscriber
   * completes OAuth. Set by `ParkManagedAgentTurn`, cleared by the OAuth
   * callback (or by the schema TTL index on abandonment).
   */
  pendingTurn?: McpConnectionPendingTurn;

  connectedAt?: string;

  createdAt: string;

  updatedAt: string;
}

export type McpConnectionDBModel = ChangePropsValueType<McpConnectionEntity, '_environmentId' | '_organizationId'>;
