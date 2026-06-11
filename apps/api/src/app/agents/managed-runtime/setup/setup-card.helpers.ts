import { MCP_SERVERS, McpConnectionAuthModeEnum, McpConnectionStatusEnum } from '@novu/shared';

import { isProviderManagedOAuthMcp, type OAuthMcp } from './oauth-mcp.types';

export interface SetupCardRow extends OAuthMcp {
  authorizeUrl?: string;
  authorizeUrlWithAutoApprove?: string;
  /** Shown when OAuth URL generation failed and no Connect button can be rendered. */
  connectUnavailableReason?: string;
  /** Provider-managed MCPs render as connected without Novu OAuth. */
  treatAsConnected?: boolean;
  /**
   * Override for the link-button label. Provider-managed MCPs use "Connect from provider"
   * to signal that auth completes inside the runtime provider's vault UI.
   */
  connectButtonLabel?: string;
}

export function resolveSetupCardOAuthFailureReason(err: unknown): string {
  let body: unknown;

  if (err && typeof err === 'object' && 'response' in err) {
    body = (err as { response?: unknown }).response;
  } else if (err && typeof err === 'object' && 'getResponse' in err) {
    body = (err as { getResponse: () => unknown }).getResponse();
  }

  const errorCode =
    body && typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : undefined;

  if (errorCode === 'mcp_novu_app_disabled') {
    return 'Not enabled for this workspace yet.';
  }

  if (errorCode === 'mcp_novu_app_credentials_missing') {
    return 'GitHub is not configured on this server. Remove it from the agent or ask an admin.';
  }

  let message: string | undefined;

  if (body && typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string') {
    message = body.message;
  } else if (err instanceof Error) {
    message = err.message;
  }

  if (message?.includes('NOVU_GITHUB_MCP_APP_CLIENT')) {
    return 'GitHub is not configured on this server. Remove it from the agent or ask an admin.';
  }

  return 'Connect is not available. Try again from the dashboard.';
}

export const SETUP_CONNECT_BUTTON_LABEL = 'Connect';

export const SETUP_CONNECT_AUTO_APPROVE_BUTTON_LABEL = 'Connect & auto-approve';

export const SETUP_RETRY_BUTTON_LABEL = 'Retry';

export const SETUP_RETRY_AUTO_APPROVE_BUTTON_LABEL = 'Retry & auto-approve';

export function resolveSetupConnectButtonLabels(mcp: SetupCardRow): {
  connect: string;
  connectWithAutoApprove: string;
} {
  if (isSetupMcpRowError(mcp)) {
    return {
      connect: SETUP_RETRY_BUTTON_LABEL,
      connectWithAutoApprove: SETUP_RETRY_AUTO_APPROVE_BUTTON_LABEL,
    };
  }

  return {
    connect: SETUP_CONNECT_BUTTON_LABEL,
    connectWithAutoApprove: SETUP_CONNECT_AUTO_APPROVE_BUTTON_LABEL,
  };
}

export const SETUP_INTRO_TEXT =
  'Connect the remaining tools below. Your message runs automatically when setup is complete.';

/** @deprecated Use SETUP_INTRO_TEXT — kept for callers outside the setup card builders. */
export const SETUP_REQUIRED_TEXT = SETUP_INTRO_TEXT;

export const SETUP_COMPLETE_TEXT_CELEBRATION = "You're all set!";

export const SETUP_COMPLETE_TEXT_WITH_PROCESSING_HINT = 'All tools connected. Your message will run automatically.';

export const SETUP_GATE_NUDGE_MARKDOWN =
  'Please finish connecting your tools using the card above. Your latest message will run automatically once setup is complete.';

export const SETUP_AUTO_APPROVE_HINT = 'Auto-approve skips approval prompts for all tools from this integration.';

/** Slack native card `body` / `subtext` mrkdwn fields allow at most 200 characters. */
export const SLACK_CARD_MCP_TEXT_MAX = 200;

export function truncateSlackCardText(text: string, max = SLACK_CARD_MCP_TEXT_MAX): string {
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export const PROVIDER_MANAGED_FOOTER_HINT = 'Some tools are already connected via your workspace — no OAuth needed.';

export function isSetupMcpRowConnected(mcp: SetupCardRow): boolean {
  return mcp.treatAsConnected === true || mcp.status === McpConnectionStatusEnum.Connected;
}

export function isSetupMcpRowPending(mcp: SetupCardRow): boolean {
  if (mcp.status === McpConnectionStatusEnum.Connected && mcp.authorizeUrl) {
    return true;
  }

  return !isSetupMcpRowConnected(mcp);
}

export function isSetupMcpRowError(mcp: SetupCardRow): boolean {
  return (
    mcp.status === McpConnectionStatusEnum.Error ||
    mcp.status === McpConnectionStatusEnum.Expired ||
    mcp.status === McpConnectionStatusEnum.Revoked
  );
}

export function countConnectedSetupCardRows(mcps: SetupCardRow[]): number {
  return mcps.filter(isSetupMcpRowConnected).length;
}

export function hasProviderManagedConnectedSetupRows(mcps: SetupCardRow[]): boolean {
  return mcps.some((mcp) => isSetupMcpRowConnected(mcp) && (mcp.treatAsConnected || isProviderManagedOAuthMcp(mcp)));
}

/** Pending rows only, errors first, then alphabetical. */
export function sortPendingSetupCardRows(mcps: SetupCardRow[]): SetupCardRow[] {
  return mcps.filter(isSetupMcpRowPending).sort((left, right) => {
    const leftError = isSetupMcpRowError(left) ? 0 : 1;
    const rightError = isSetupMcpRowError(right) ? 0 : 1;

    if (leftError !== rightError) {
      return leftError - rightError;
    }

    return left.name.localeCompare(right.name);
  });
}

export function resolveMcpDescription(mcpId: string): string {
  return MCP_SERVERS.find((entry) => entry.id === mcpId)?.description ?? '';
}

function resolveMcpPermissionHint(mcpId: string): string | undefined {
  const oauth = MCP_SERVERS.find((entry) => entry.id === mcpId)?.oauth;

  if (
    !oauth ||
    oauth.mode === McpConnectionAuthModeEnum.ProviderManaged ||
    oauth.mode === McpConnectionAuthModeEnum.Dcr
  ) {
    return undefined;
  }

  if (!('scopes' in oauth) || oauth.scopes.length === 0) {
    return undefined;
  }

  const preview = oauth.scopes.slice(0, 4).join(', ');
  const suffix = oauth.scopes.length > 4 ? ', …' : '';

  return `Permissions requested: ${preview}${suffix}`;
}

export function resolveMcpStatusHint(mcp: SetupCardRow): string | undefined {
  if (mcp.status === McpConnectionStatusEnum.Expired) {
    return 'Connection expired — reconnect to continue.';
  }

  if (mcp.status === McpConnectionStatusEnum.Revoked) {
    return 'Access revoked — reconnect to continue.';
  }

  if (mcp.status === McpConnectionStatusEnum.Error) {
    return mcp.errorMessage ?? 'Connection failed — try again.';
  }

  return undefined;
}

export function resolveProviderManagedRowHint(mcp: SetupCardRow): string | undefined {
  if (!mcp.treatAsConnected && !isProviderManagedOAuthMcp(mcp)) {
    return undefined;
  }

  return 'Connected via your workspace — no OAuth needed.';
}

export function buildMcpCardBodyMarkdown(mcp: SetupCardRow): string {
  const lines: string[] = [];

  const description = resolveMcpDescription(mcp.mcpId);
  if (description) {
    lines.push(description);
  }

  const providerManagedHint = resolveProviderManagedRowHint(mcp);
  if (providerManagedHint) {
    lines.push(`_${providerManagedHint}_`);
  }

  const statusHint = resolveMcpStatusHint(mcp);
  if (statusHint) {
    lines.push(`_${statusHint}_`);
  }

  const permissionHint = resolveMcpPermissionHint(mcp.mcpId);
  if (permissionHint) {
    lines.push(`_${permissionHint}_`);
  }

  if (!mcp.authorizeUrl && isSetupMcpRowPending(mcp)) {
    lines.push(
      `_${mcp.connectUnavailableReason ?? "Connect isn't available right now. Try again from the dashboard."}_`
    );
  }

  return lines.join('\n');
}

/** Short subtitle for Slack native cards — one-line status only; longer copy goes in body. */
export function buildMcpCardSubtitleMarkdown(mcp: SetupCardRow): string | undefined {
  if (mcp.status === McpConnectionStatusEnum.Expired) {
    return 'Connection expired';
  }

  if (mcp.status === McpConnectionStatusEnum.Revoked) {
    return 'Access revoked';
  }

  if (mcp.status === McpConnectionStatusEnum.Error) {
    return 'Connection failed';
  }

  if (!mcp.authorizeUrl && isSetupMcpRowPending(mcp)) {
    return 'Connect unavailable';
  }

  return undefined;
}

/** Catalog description only — Slack card `body` is capped at 200 characters. */
export function buildMcpSlackCardBodyText(mcp: SetupCardRow): string | undefined {
  const description = resolveMcpDescription(mcp.mcpId);

  if (!description) {
    return undefined;
  }

  return truncateSlackCardText(description);
}

/** Secondary hint below the body: unavailable reason, error detail, or auto-approve copy. */
export function resolveMcpSlackCardSubtext(mcp: SetupCardRow): string | undefined {
  if (!mcp.authorizeUrl && isSetupMcpRowPending(mcp)) {
    return truncateSlackCardText(
      mcp.connectUnavailableReason ?? 'Connect is not available. Try again from the dashboard.'
    );
  }

  const statusHint = resolveMcpStatusHint(mcp);
  if (statusHint) {
    return truncateSlackCardText(statusHint);
  }

  if (mcp.authorizeUrlWithAutoApprove && isSetupMcpRowPending(mcp)) {
    return SETUP_AUTO_APPROVE_HINT;
  }

  return undefined;
}

export function buildMcpRowPlainText(mcp: SetupCardRow): string {
  const body = buildMcpCardBodyMarkdown(mcp)
    .split('\n')
    .map((line) => line.replace(/^_(.+)_$/, '$1'))
    .filter(Boolean);

  return body.join('\n');
}

interface SetupActionButton {
  type: 'link-button';
  label: string;
  url: string;
  style?: string;
}

function buildSetupMcpActionButtons(mcp: SetupCardRow & { authorizeUrl: string }): SetupActionButton[] {
  const authorizeUrl = mcp.authorizeUrl;

  if (mcp.authorizeUrlWithAutoApprove && !mcp.connectButtonLabel) {
    const labels = resolveSetupConnectButtonLabels(mcp);

    return [
      { type: 'link-button', label: labels.connectWithAutoApprove, url: mcp.authorizeUrlWithAutoApprove },
      { type: 'link-button', label: labels.connect, url: authorizeUrl },
    ];
  }

  const defaultLabel = isSetupMcpRowError(mcp) ? SETUP_RETRY_BUTTON_LABEL : SETUP_CONNECT_BUTTON_LABEL;

  return [{ type: 'link-button', label: mcp.connectButtonLabel ?? defaultLabel, url: authorizeUrl, style: 'primary' }];
}

/**
 * Flat portable blocks for one MCP: a bold name header, optional description/status
 * lines, and an `actions` block with the Connect link-buttons — all appended directly
 * to the parent card's children rather than wrapped in a nested `card`. The Chat SDK
 * card schema has no nested-card element, so non-Slack adapters (Telegram, Teams,
 * Discord, Google Chat, WhatsApp, …) silently drop a `card` placed inside a card and
 * never render its buttons. Keeping the rows flat lets every portable adapter render
 * the Connect buttons. Slack uses its own native Block Kit builder in setup-card.slack.ts.
 */
export function buildSetupMcpPortableRowBlocks(mcp: SetupCardRow): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [{ type: 'text', content: `**${mcp.name}**` }];

  const body = buildMcpRowPlainText(mcp);
  if (body) {
    blocks.push({ type: 'text', content: body, style: 'muted' });
  }

  if (mcp.authorizeUrlWithAutoApprove && !mcp.connectButtonLabel && isSetupMcpRowPending(mcp)) {
    blocks.push({ type: 'text', content: SETUP_AUTO_APPROVE_HINT, style: 'muted' });
  }

  const authorizeUrl = mcp.authorizeUrl;
  if (authorizeUrl && isSetupMcpRowPending(mcp)) {
    blocks.push({ type: 'actions', children: buildSetupMcpActionButtons({ ...mcp, authorizeUrl }) });
  }

  return blocks;
}

export function buildPendingPortableRowBlocks(mcps: SetupCardRow[]): Record<string, unknown>[] {
  const pendingRows = sortPendingSetupCardRows(mcps);
  const blocks: Record<string, unknown>[] = [];

  pendingRows.forEach((mcp, index) => {
    if (index > 0) {
      blocks.push({ type: 'divider' });
    }

    blocks.push(...buildSetupMcpPortableRowBlocks(mcp));
  });

  return blocks;
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

  const children = [{ type: 'text', content: SETUP_INTRO_TEXT }, ...buildPendingPortableRowBlocks(params.mcps)];

  return {
    type: 'card',
    title,
    children,
  };
}
