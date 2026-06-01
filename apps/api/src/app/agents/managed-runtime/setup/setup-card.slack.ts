import { getMcpIconUrl } from '@novu/shared';
import type { Block, SectionBlock } from '@slack/types';

import type { SlackNativeDelivery } from '../../conversation-runtime/egress/slack-native-delivery';
import {
  buildMcpCardSubtitleMarkdown,
  buildMcpSlackCardBodyText,
  isSetupMcpRowPending,
  resolveMcpDescription,
  resolveMcpSlackCardSubtext,
  resolveSetupConnectButtonLabels,
  SETUP_INTRO_TEXT,
  type SetupCardRow,
  sortPendingSetupCardRows,
} from './setup-card.helpers';

type SlackCardBlock = Block & {
  type: 'card';
  icon?: { type: 'image'; image_url: string; alt_text: string };
  title?: { type: 'mrkdwn'; text: string; verbatim?: boolean };
  subtitle?: { type: 'mrkdwn'; text: string; verbatim?: boolean };
  body?: { type: 'mrkdwn'; text: string; verbatim?: boolean };
  subtext?: { type: 'mrkdwn'; text: string; verbatim?: boolean };
  actions?: Array<{
    type: 'button';
    text: { type: 'plain_text'; text: string; emoji?: boolean };
    url?: string;
    style?: 'primary' | 'danger';
  }>;
};

function resolveDashboardBaseUrl(): string {
  for (const candidate of [process.env.DASHBOARD_URL, process.env.FRONT_BASE_URL]) {
    const trimmed = candidate?.trim();

    if (!trimmed || trimmed.startsWith('^')) {
      continue;
    }

    return trimmed.replace(/\/$/, '');
  }

  return 'https://dashboard.novu.co';
}

function resolveMcpIconUrl(mcpId: string): string {
  return getMcpIconUrl(mcpId, resolveDashboardBaseUrl());
}

function buildMcpSlackCardBlock(mcp: SetupCardRow): SlackCardBlock {
  const subtitle = buildMcpCardSubtitleMarkdown(mcp);
  const body = buildMcpSlackCardBodyText(mcp);
  const subtext = resolveMcpSlackCardSubtext(mcp);
  const description = resolveMcpDescription(mcp.mcpId);

  const cardBlock: SlackCardBlock = {
    type: 'card',
    icon: {
      type: 'image',
      image_url: resolveMcpIconUrl(mcp.mcpId),
      alt_text: description ? `${mcp.name}: ${description}` : mcp.name,
    },
    title: { type: 'mrkdwn', text: `*${mcp.name}*`, verbatim: false },
    ...(subtitle ? { subtitle: { type: 'mrkdwn', text: subtitle, verbatim: false } } : {}),
    ...(body ? { body: { type: 'mrkdwn', text: body, verbatim: false } } : {}),
    ...(subtext ? { subtext: { type: 'mrkdwn', text: subtext, verbatim: false } } : {}),
  };

  if (mcp.authorizeUrl && isSetupMcpRowPending(mcp)) {
    const labels = resolveSetupConnectButtonLabels(mcp);
    const actions: SlackCardBlock['actions'] = [];

    if (mcp.authorizeUrlWithAutoApprove) {
      actions.push({
        type: 'button',
        text: { type: 'plain_text', text: labels.connectWithAutoApprove, emoji: false },
        url: mcp.authorizeUrlWithAutoApprove,
      });
    }

    actions.push({
      type: 'button',
      text: { type: 'plain_text', text: labels.connect, emoji: false },
      url: mcp.authorizeUrl,
      style: 'primary',
    });

    cardBlock.actions = actions;
  }

  return cardBlock;
}

export function buildSetupMcpSlackBlocks(mcp: SetupCardRow): SlackNativeDelivery {
  return {
    blocks: [buildMcpSlackCardBlock(mcp)],
    text: `Connect ${mcp.name}`,
  };
}

export function buildSetupSlackBlocks(mcps: SetupCardRow[]): SlackNativeDelivery {
  const pendingRows = sortPendingSetupCardRows(mcps);

  const introBlock: SectionBlock = {
    type: 'section',
    text: { type: 'mrkdwn', text: SETUP_INTRO_TEXT, verbatim: false },
  };

  const blocks = [introBlock, ...pendingRows.map((mcp) => buildMcpSlackCardBlock(mcp))];

  const pendingNames = pendingRows.map((row) => row.name).join(', ');

  return {
    blocks,
    text: pendingNames ? `Connect ${pendingNames}` : 'Connect your tools',
  };
}
