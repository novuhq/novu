import type { AgentMcpServerAuthMode } from '@novu/dal';
import { MCP_SERVERS, McpConnectionAuthModeEnum, McpConnectionStatusEnum } from '@novu/shared';

export interface OAuthMcp {
  mcpId: string;
  name: string;
  agentMcpServerId: string;
  /** Catalog default from the agent enablement row. */
  defaultAuthMode?: AgentMcpServerAuthMode;
  /** Absent when no connection row exists yet for this enablement. */
  status?: McpConnectionStatusEnum;
  errorMessage?: string;
}

export function isProviderManagedOAuthMcp(mcp: OAuthMcp): boolean {
  if (mcp.defaultAuthMode === McpConnectionAuthModeEnum.ProviderManaged) {
    return true;
  }

  const catalog = MCP_SERVERS.find((entry) => entry.id === mcp.mcpId);

  return catalog?.oauth?.mode === McpConnectionAuthModeEnum.ProviderManaged;
}

export function isOAuthMcpPending(mcp: OAuthMcp): boolean {
  if (isProviderManagedOAuthMcp(mcp)) {
    return false;
  }

  return mcp.status !== McpConnectionStatusEnum.Connected;
}
