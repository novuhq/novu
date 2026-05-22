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
}

export function buildMcpOAuthRedirectUri(): string {
  if (!process.env.API_ROOT_URL) {
    throw new Error('API_ROOT_URL environment variable is required');
  }

  const baseUrl = process.env.API_ROOT_URL.replace(/\/$/, '');

  return `${baseUrl}${MCP_OAUTH_CALLBACK_PATH}`;
}
