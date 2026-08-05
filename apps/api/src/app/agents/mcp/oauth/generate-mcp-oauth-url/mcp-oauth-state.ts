import { McpConnectionScopeEnum } from '@novu/shared';

import { buildAgentApiRootUrl } from '../../../shared/util/agent-api-root-url';
import { MCP_OAUTH_CALLBACK_PATH } from './mcp-oauth.constants';

/**
 * Full OAuth callback context. Historically this entire object was signed into
 * the authorize URL's `state` parameter. Several authorization servers
 * (notably Campfire) reject `state` values over 512 characters, and
 * chat-initiated connects with session-resume fields exceed that budget.
 *
 * The fat fields now live on `mcp_connection.oauthState.callbackContext` and
 * only a short opaque {@link McpOAuthStateRef} round-trips through the AS.
 */
export interface McpOAuthState {
  /** Mongo `Agent._id` of the agent the enablement belongs to. */
  agentId: string;
  agentMcpServerId: string;
  /** Mongo Subscriber._id (not the external subscriberId). */
  subscriberId: string;
  environmentId: string;
  organizationId: string;
  mcpId: string;
  scope: McpConnectionScopeEnum;
  timestamp: number;
  /** Conversation that initiated setup — used to replay the parked inbound turn. */
  conversationId?: string;
  /** Dashboard/API user or organization id that initiated the flow. */
  userId?: string;
  /** Where the OAuth URL was generated — round-trips for consistent callback attribution. */
  source?: 'api' | 'user_chat';
  /** When set, persist server-wide tool auto-approve in `agent_tool_trust` after OAuth succeeds. */
  trustToolsOnConnect?: boolean;

  // ── Session resume fields (source: 'user_chat') ──────────────────────
  // Persisted on the connection row (not in the authorize URL) so the
  // callback can resume the waiting session without blowing AS state limits.
  /** custom_tool_use ID — the callback sends a tool result for this ID to resume the session. */
  toolUseId?: string;
  agentIdentifier?: string;
  integrationIdentifier?: string;
  platform?: string;
  platformThreadId?: string;
}

/**
 * Compact signed payload carried as the OAuth `state` query parameter.
 * Looks up the pending connection via `oauthState.stateNonce` and rebuilds
 * {@link McpOAuthState} from the stored `callbackContext`.
 *
 * `trustToolsOnConnect` stays in the URL (not on the row) so the setup-card
 * Connect / Auto-approve buttons can share one pending session while still
 * differing on tool trust.
 */
export interface McpOAuthStateRef {
  v: 1;
  environmentId: string;
  organizationId: string;
  /** Pending `mcp_connection` row — survives callback even after `oauthState` is cleared. */
  connectionId: string;
  nonce: string;
  timestamp: number;
  trustToolsOnConnect?: boolean;
}

/**
 * Chat / analytics fields persisted on the pending connection while OAuth
 * is in flight. Rehydrated into {@link McpOAuthState} on callback.
 */
export type McpOAuthCallbackContext = Omit<
  McpOAuthState,
  'environmentId' | 'organizationId' | 'timestamp' | 'trustToolsOnConnect'
>;

export function isMcpOAuthStateRef(payload: unknown): payload is McpOAuthStateRef {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const candidate = payload as Partial<McpOAuthStateRef>;

  return (
    candidate.v === 1 &&
    typeof candidate.environmentId === 'string' &&
    typeof candidate.organizationId === 'string' &&
    typeof candidate.connectionId === 'string' &&
    typeof candidate.nonce === 'string' &&
    typeof candidate.timestamp === 'number'
  );
}

export function buildMcpOAuthRedirectUri(): string {
  return `${buildAgentApiRootUrl()}${MCP_OAUTH_CALLBACK_PATH}`;
}
