import { McpConnectionScopeEnum } from '@novu/shared';

import { buildAgentApiRootUrl } from '../../../shared/util/agent-api-root-url';
import { MCP_OAUTH_CALLBACK_PATH } from './mcp-oauth.constants';

/**
 * Signed payload that round-trips through the provider's OAuth flow as the
 * `state` query parameter. The signature is verified using the originating
 * environment's API key on callback.
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
  /** When set, persist server-wide tool auto-approve on the connection after OAuth succeeds. */
  trustToolsOnConnect?: boolean;

  // ── Session resume fields (source: 'user_chat') ──────────────────────
  // Carried through the OAuth redirect so the callback can resume the
  // waiting session without additional DB lookups.
  /** custom_tool_use ID — the callback sends a tool result for this ID to resume the session. */
  toolUseId?: string;
  agentIdentifier?: string;
  integrationIdentifier?: string;
  platform?: string;
  platformThreadId?: string;
}

export function buildMcpOAuthRedirectUri(): string {
  return `${buildAgentApiRootUrl()}${MCP_OAUTH_CALLBACK_PATH}`;
}
