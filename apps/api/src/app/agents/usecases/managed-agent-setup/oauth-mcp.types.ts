import { McpConnectionStatusEnum } from '@novu/shared';

export interface OAuthMcp {
  mcpId: string;
  name: string;
  agentMcpServerId: string;
  /** Absent when no connection row exists yet for this enablement. */
  status?: McpConnectionStatusEnum;
  errorMessage?: string;
}

export function isOAuthMcpPending(mcp: OAuthMcp): boolean {
  return mcp.status !== McpConnectionStatusEnum.Connected;
}
