import type { McpConnectionOAuthCallbackContext } from '@novu/dal';
import { McpConnectionScopeEnum } from '@novu/shared';

import { buildAgentApiRootUrl } from '../../../shared/util/agent-api-root-url';
import { MCP_OAUTH_CALLBACK_PATH } from './mcp-oauth.constants';

/**
 * Persisted fat OAuth callback fields — canonical shape is the DAL entity type
 * on `mcp_connection.oauthState.callbackContext`.
 */
export type McpOAuthCallbackContext = McpConnectionOAuthCallbackContext;

/**
 * Full OAuth callback context after rehydration. Historically this entire
 * object was signed into the authorize URL's `state` parameter. Several
 * authorization servers (notably Campfire) reject `state` values over 512
 * characters, so fat fields now live on the connection row and only a short
 * opaque {@link McpOAuthStateRef} round-trips through the AS.
 */
export interface McpOAuthState extends Omit<McpOAuthCallbackContext, 'scope'> {
  environmentId: string;
  organizationId: string;
  timestamp: number;
  /** When set, persist server-wide tool auto-approve in `agent_tool_trust` after OAuth succeeds. */
  trustToolsOnConnect?: boolean;
  /** Narrowed from the persisted string union for API consumers. */
  scope: McpConnectionScopeEnum;
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

/**
 * Rebuild {@link McpOAuthState} from the row-persisted callback context plus
 * the compact signed ref fields (env/org/timestamp/trust flag).
 */
export function mergeCallbackContextIntoOAuthState(
  callbackContext: McpOAuthCallbackContext,
  stateRef: Pick<McpOAuthStateRef, 'environmentId' | 'organizationId' | 'timestamp' | 'trustToolsOnConnect'>
): McpOAuthState {
  return {
    ...callbackContext,
    environmentId: stateRef.environmentId,
    organizationId: stateRef.organizationId,
    timestamp: stateRef.timestamp,
    scope: callbackContext.scope as McpConnectionScopeEnum,
    ...(stateRef.trustToolsOnConnect ? { trustToolsOnConnect: true } : {}),
  };
}

export function buildMcpOAuthRedirectUri(): string {
  return `${buildAgentApiRootUrl()}${MCP_OAUTH_CALLBACK_PATH}`;
}
