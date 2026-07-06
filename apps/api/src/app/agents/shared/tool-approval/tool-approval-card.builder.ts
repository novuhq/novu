import { getMcpIconUrl, MCP_ICON_DEFAULT_ID, resolveMcpCatalogIdByName } from '@novu/shared';
import type { Block } from '@slack/types';
import type { SlackNativeDelivery } from '../../conversation-runtime/egress/slack-native-delivery';

const SLACK_INPUT_SUMMARY_MAX = 80;

type SlackCardBlock = Block & {
  type: 'card';
  icon?: { type: 'image'; image_url: string; alt_text: string };
  title?: { type: 'mrkdwn'; text: string; verbatim?: boolean };
  subtitle?: { type: 'mrkdwn'; text: string; verbatim?: boolean };
  body?: { type: 'mrkdwn'; text: string; verbatim?: boolean };
  actions?: Array<{
    type: 'button';
    action_id: string;
    value?: string;
    text: { type: 'plain_text'; text: string; emoji?: boolean };
    style?: 'primary' | 'danger';
  }>;
};

type SlackActionsBlock = Block & {
  type: 'actions';
  elements: Array<{
    type: 'button';
    action_id: string;
    value?: string;
    text: { type: 'plain_text'; text: string; emoji?: boolean };
  }>;
};

export interface ApprovalCardButton {
  id: string;
  label: string;
  value?: string;
}

/** Normalized input for the shared approval card renderer (managed + self-hosted mappers). */
export interface ApprovalCardSpec {
  title: string;
  subtitlePortable: string;
  subtitleSlack: string;
  bodySlack?: string;
  slackText: string;
  icon: { value?: string; fallbackName?: string };
  deny: ApprovalCardButton;
  approve: ApprovalCardButton;
  trust?: {
    tool: ApprovalCardButton;
    server?: ApprovalCardButton;
  };
}

export function resolveDashboardBaseUrl(): string {
  for (const candidate of [process.env.DASHBOARD_URL, process.env.FRONT_BASE_URL]) {
    const trimmed = candidate?.trim();

    if (!trimmed || trimmed.startsWith('^')) {
      continue;
    }

    return trimmed.replace(/\/$/, '');
  }

  return 'https://dashboard.novu.co';
}

export function resolveToolApprovalIconUrl(
  icon: string | undefined,
  fallbackName: string | undefined,
  baseUrl: string
): string {
  if (icon && /^https?:\/\//i.test(icon)) {
    return icon;
  }

  const catalogId = icon
    ? (resolveMcpCatalogIdByName(icon) ?? icon)
    : (resolveMcpCatalogIdByName(fallbackName) ?? MCP_ICON_DEFAULT_ID);

  return getMcpIconUrl(catalogId, baseUrl);
}

export function summariseToolInput(input: Record<string, unknown> | undefined): string {
  if (!input) return '';
  const first = Object.values(input)[0];
  if (first === undefined) return '';
  const text = typeof first === 'string' ? first : JSON.stringify(first);

  return text.length > SLACK_INPUT_SUMMARY_MAX ? `${text.slice(0, SLACK_INPUT_SUMMARY_MAX - 3)}...` : text;
}

function portableButton(button: ApprovalCardButton, style: 'default' | 'primary'): Record<string, unknown> {
  return {
    type: 'button',
    id: button.id,
    label: button.label,
    style,
    ...(button.value ? { value: button.value } : {}),
  };
}

function slackButton(button: ApprovalCardButton, style?: 'primary'): NonNullable<SlackCardBlock['actions']>[number] {
  return {
    type: 'button',
    action_id: button.id,
    ...(button.value ? { value: button.value } : {}),
    text: { type: 'plain_text', text: button.label, emoji: false },
    ...(style ? { style } : {}),
  };
}

export function buildPortableApprovalCard(spec: ApprovalCardSpec): Record<string, unknown> {
  const portableChildren: Record<string, unknown>[] = [
    {
      type: 'actions',
      children: [portableButton(spec.deny, 'default'), portableButton(spec.approve, 'primary')],
    },
  ];

  if (spec.trust) {
    const trustButtons = [portableButton(spec.trust.tool, 'default')];
    if (spec.trust.server) {
      trustButtons.push(portableButton(spec.trust.server, 'default'));
    }
    portableChildren.push({ type: 'divider' }, { type: 'actions', children: trustButtons });
  }

  return {
    type: 'card',
    title: spec.title,
    subtitle: spec.subtitlePortable,
    children: portableChildren,
  };
}

export function buildSlackNativeApprovalCard(spec: ApprovalCardSpec, ctx: { baseUrl: string }): SlackNativeDelivery {
  const cardBlock: SlackCardBlock = {
    type: 'card',
    icon: {
      type: 'image',
      image_url: resolveToolApprovalIconUrl(spec.icon.value, spec.icon.fallbackName, ctx.baseUrl),
      alt_text: spec.icon.fallbackName ?? 'Tool',
    },
    title: { type: 'mrkdwn', text: spec.title, verbatim: false },
    subtitle: { type: 'mrkdwn', text: spec.subtitleSlack, verbatim: false },
    ...(spec.bodySlack ? { body: { type: 'mrkdwn', text: spec.bodySlack, verbatim: false } } : {}),
    actions: [slackButton(spec.deny), slackButton(spec.approve, 'primary')],
  };

  const blocks: Block[] = [cardBlock];

  if (spec.trust) {
    const elements = [slackButton(spec.trust.tool)];
    if (spec.trust.server) {
      elements.push(slackButton(spec.trust.server));
    }
    const trustBlock: SlackActionsBlock = { type: 'actions', elements };
    blocks.push(trustBlock);
  }

  return { blocks, text: spec.slackText };
}

export function buildToolApprovalCard(
  spec: ApprovalCardSpec,
  ctx: { baseUrl: string }
): { portable: Record<string, unknown>; slackNative: SlackNativeDelivery } {
  return {
    portable: buildPortableApprovalCard(spec),
    slackNative: buildSlackNativeApprovalCard(spec, ctx),
  };
}
