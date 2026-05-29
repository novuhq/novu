import { McpConnectionStatusEnum } from '@novu/shared';

import type { OAuthMcp } from './oauth-mcp.types';

export interface SetupCardRow extends OAuthMcp {
  authorizeUrl?: string;
}

const SETUP_REQUIRED_TEXT =
  'Connect the tools below to continue. Your message will be handled automatically once setup is complete.';

const SETUP_COMPLETE_TEXT = 'All tools connected. Working on your message…';

function isErrorStatus(status: OAuthMcp['status']): boolean {
  return (
    status === McpConnectionStatusEnum.Error ||
    status === McpConnectionStatusEnum.Expired ||
    status === McpConnectionStatusEnum.Revoked
  );
}

function buildConnectedRowBlocks(mcp: SetupCardRow): Record<string, unknown>[] {
  return [{ type: 'text', content: `**${mcp.name}**  ✅` }];
}

function buildPendingRowBlocks(mcp: SetupCardRow): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [{ type: 'text', content: `**${mcp.name}**` }];

  if (isErrorStatus(mcp.status) && mcp.errorMessage) {
    blocks.push({ type: 'text', content: mcp.errorMessage, style: 'muted' });
  }

  if (mcp.authorizeUrl) {
    blocks.push({
      type: 'actions',
      children: [
        {
          type: 'link-button',
          label: isErrorStatus(mcp.status) ? 'Retry' : 'Connect',
          url: mcp.authorizeUrl,
          style: 'primary',
        },
      ],
    });
  }

  return blocks;
}

function buildMcpRowBlocks(mcp: SetupCardRow): Record<string, unknown>[] {
  if (mcp.status === McpConnectionStatusEnum.Connected) {
    return buildConnectedRowBlocks(mcp);
  }

  return buildPendingRowBlocks(mcp);
}

export function buildSetupCard(params: { mcps: SetupCardRow[]; resolved?: boolean }): Record<string, unknown> {
  const title = params.resolved ? 'Setup complete' : 'Connect your tools';

  if (params.resolved) {
    return {
      type: 'card',
      title,
      children: [{ type: 'text', content: SETUP_COMPLETE_TEXT }],
    };
  }

  const children = [
    { type: 'text', content: SETUP_REQUIRED_TEXT },
    ...params.mcps.flatMap((mcp) => buildMcpRowBlocks(mcp)),
  ];

  return {
    type: 'card',
    title,
    children,
  };
}
