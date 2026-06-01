import { McpConnectionScopeEnum } from '@novu/shared';

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
  /** Dashboard/API user that initiated the flow; `system` for managed setup cards. */
  userId?: string;
  /** Where the OAuth URL was generated — round-trips for consistent callback attribution. */
  source?: 'api' | 'setup_card';
  /** When set, persist server-wide tool auto-approve on the connection after OAuth succeeds. */
  trustToolsOnConnect?: boolean;
}

export function buildMcpOAuthRedirectUri(): string {
  // Upstream MCP providers must reach the callback over the public internet,
  // so `api.novu.localhost` and other LAN-only hostnames are unreachable.
  // `AGENT_API_HOSTNAME` (e.g. an ngrok URL) takes precedence over the
  // standard `API_ROOT_URL` so a tunnelled API can be addressed without
  // rewriting the regular root URL. Matches the convention used by the
  // Slack / Telegram / WhatsApp webhook configurators.
  const rootUrl = process.env.AGENT_API_HOSTNAME?.trim() || process.env.API_ROOT_URL?.trim();
  if (!rootUrl) {
    throw new Error('AGENT_API_HOSTNAME or API_ROOT_URL environment variable is required');
  }

  const baseUrl = rootUrl.replace(/\/$/, '');

  return `${baseUrl}${MCP_OAUTH_CALLBACK_PATH}`;
}
