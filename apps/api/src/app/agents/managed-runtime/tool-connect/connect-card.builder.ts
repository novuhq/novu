import { getMcpIconUrl, MCP_SERVERS } from '@novu/shared';
import type { Block } from '@slack/types';

import type { SlackNativeDelivery } from '../../conversation-runtime/egress/slack-native-delivery';
import type { ReplyContentDto } from '../../shared/dtos/agent-reply-payload.dto';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

type SlackCardBlock = Block & {
  type: 'card';
  icon?: { type: 'image'; image_url: string; alt_text: string };
  title?: { type: 'mrkdwn'; text: string; verbatim?: boolean };
  subtitle?: { type: 'mrkdwn'; text: string; verbatim?: boolean };
  body?: { type: 'mrkdwn'; text: string; verbatim?: boolean };
  actions?: Array<{
    type: 'button';
    text: { type: 'plain_text'; text: string; emoji?: boolean };
    url?: string;
    style?: 'primary' | 'danger';
  }>;
};

const SLACK_CARD_BODY_MAX = 200;

export type ConnectCardDelivery = {
  content: ReplyContentDto;
  slackNative?: SlackNativeDelivery;
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

function resolveMcpDescription(mcpId: string): string | undefined {
  const description = MCP_SERVERS.find((entry) => entry.id === mcpId)?.description;

  if (!description) return undefined;

  return description.length <= SLACK_CARD_BODY_MAX
    ? description
    : `${description.slice(0, SLACK_CARD_BODY_MAX - 1).trimEnd()}…`;
}

function buildConnectCardSlackBlocks(params: {
  mcpId: string;
  mcpName: string;
  authorizeUrl: string;
  authorizeUrlWithAutoApprove?: string;
}): SlackNativeDelivery {
  const body = resolveMcpDescription(params.mcpId);

  const actions: NonNullable<SlackCardBlock['actions']> = [];

  if (params.authorizeUrlWithAutoApprove) {
    actions.push({
      type: 'button',
      text: { type: 'plain_text', text: 'Connect & auto-approve', emoji: false },
      url: params.authorizeUrlWithAutoApprove,
    });
  }

  actions.push({
    type: 'button',
    style: 'primary',
    text: { type: 'plain_text', text: 'Connect', emoji: false },
    url: params.authorizeUrl,
  });

  const cardBlock: SlackCardBlock = {
    type: 'card',
    icon: {
      type: 'image',
      image_url: resolveMcpIconUrl(params.mcpId),
      alt_text: body ? `${params.mcpName}: ${body}` : params.mcpName,
    },
    title: { type: 'mrkdwn', text: `*${params.mcpName}*`, verbatim: false },
    subtitle: {
      type: 'mrkdwn',
      text: `To proceed, connect your ${params.mcpName} account.`,
      verbatim: false,
    },
    ...(body ? { body: { type: 'mrkdwn', text: body, verbatim: false } } : {}),
    actions,
  };

  return {
    blocks: [cardBlock],
    text: `Connect ${params.mcpName}`,
  };
}

export function buildConnectCard(params: {
  platform: AgentPlatformEnum;
  mcpId: string;
  mcpName: string;
  authorizeUrl: string;
  authorizeUrlWithAutoApprove?: string;
}): ConnectCardDelivery {
  const content: ReplyContentDto = {
    card: {
      type: 'card',
      title: `Connect ${params.mcpName}`,
      children: [
        {
          type: 'text',
          content: `To proceed, connect your ${params.mcpName} account.`,
        },
        {
          type: 'actions',
          children: [
            {
              type: 'link-button',
              label: 'Connect',
              url: params.authorizeUrl,
              style: 'primary',
            },
          ],
        },
      ],
    },
  };

  if (params.platform === AgentPlatformEnum.SLACK) {
    return {
      content,
      slackNative: buildConnectCardSlackBlocks(params),
    };
  }

  return { content };
}
