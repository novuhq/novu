import { McpConnectionStatusEnum } from '@novu/shared';

import type { OAuthMcp } from './oauth-mcp.types';

export interface SetupCardRow extends OAuthMcp {
  authorizeUrl?: string;
  /**
   * Override for the link-button label. Defaults to "Connect" / "Retry"
   * (on error) when omitted. Provider-managed MCPs use "Connect from provider"
   * to signal that auth completes inside the runtime provider's vault UI.
   */
  connectButtonLabel?: string;
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
    const defaultLabel = isErrorStatus(mcp.status) ? 'Retry' : 'Connect';

    blocks.push({
      type: 'actions',
      children: [
        {
          type: 'link-button',
          label: mcp.connectButtonLabel ?? defaultLabel,
          url: mcp.authorizeUrl,
          style: 'primary',
        },
      ],
    });
  }

  return blocks;
}

function buildMcpRowBlocks(mcp: SetupCardRow): Record<string, unknown>[] {
  // When an authorize URL is present on a connected row, the connection needs
  // to be re-authorized (e.g. Thalamus reported MCP initialize failed even
  // though Novu's DB row says connected). Render the pending row so the user
  // sees the Connect button instead of a stale checkmark.
  if (mcp.status === McpConnectionStatusEnum.Connected && !mcp.authorizeUrl) {
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
