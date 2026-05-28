import { McpConnectionStatusEnum } from '@novu/shared';

type OAuthMcpStatus = McpConnectionStatusEnum | 'missing';

export type OAuthMcp = {
  mcpId: string;
  name: string;
  agentMcpServerId: string;
  status: OAuthMcpStatus;
  errorMessage?: string;
};

export function isOAuthMcpPending(mcp: OAuthMcp): boolean {
  return mcp.status !== McpConnectionStatusEnum.Connected;
}
