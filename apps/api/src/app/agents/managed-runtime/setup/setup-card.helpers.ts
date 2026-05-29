import { McpConnectionStatusEnum } from '@novu/shared';

import type { OAuthMcp } from './oauth-mcp.types';

export interface SetupCardRow extends OAuthMcp {
  authorizeUrl?: string;
}

const SETUP_REQUIRED_TEXT =
  'Connect the tools below to continue. Your message will be handled automatically once setup is complete.';

const SETUP_COMPLETE_TEXT_CELEBRATION = "You're all set!";

const SETUP_COMPLETE_TEXT_WITH_PROCESSING_HINT = 'All tools connected. Your message will run automatically.';

export const SETUP_GATE_NUDGE_MARKDOWN =
  'Please finish connecting your tools using the card above. Your latest message will run automatically once setup is complete.';

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

export function buildSetupCard(params: {
  mcps: SetupCardRow[];
  resolved?: boolean;
  showProcessingHint?: boolean;
}): Record<string, unknown> {
  const title = params.resolved ? 'Setup complete' : 'Connect your tools';

  if (params.resolved) {
    const showProcessingHint = params.showProcessingHint !== false;
    const body = showProcessingHint ? SETUP_COMPLETE_TEXT_WITH_PROCESSING_HINT : SETUP_COMPLETE_TEXT_CELEBRATION;

    return {
      type: 'card',
      title,
      children: [{ type: 'text', content: body }],
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
