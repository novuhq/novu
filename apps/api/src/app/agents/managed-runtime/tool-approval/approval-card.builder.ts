import type { PendingToolApproval } from '@novu/application-generic';
import { getMcpIconUrl, MCP_ICON_DEFAULT_ID, resolveMcpCatalogIdByName } from '@novu/shared';
import type { ActionRequired, Response as ThalamusResponse } from '@novu/thalamus';
import type { ActionsBlock, Block } from '@slack/types';
import type { SlackNativeDelivery } from '../../conversation-runtime/egress/slack-native-delivery';
import type { ReplyContentDto } from '../../shared/dtos/agent-reply-payload.dto';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

export const TOOL_APPROVAL_ACTION_PREFIX = 'mcp-approval' as const;

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

function resolveSlackMcpIconUrl(mcpServerName?: string): string {
  const mcpId = resolveMcpCatalogIdByName(mcpServerName) ?? MCP_ICON_DEFAULT_ID;

  return getMcpIconUrl(mcpId, resolveDashboardBaseUrl());
}

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

export type ManagedCardDelivery = {
  content: ReplyContentDto;
  slackNative?: SlackNativeDelivery;
};

// Slack button clicks include action.id (parsed below) and action.value (label text only).
// Id: mcp-approval:{approve|deny|approve-tool|approve-server}:{toolUseIds}:{turnId}
// "Always allow" buttons append :{toolName}:{mcpServerName} (URI-encoded) for trust storage.
export type ParsedToolApprovalAction = {
  approved: boolean;
  toolUseIds: string[];
  turnId: string;
  persistScope?: 'tool' | 'server';
  toolName?: string;
  mcpServerName?: string;
};

export function parseToolApprovalActionId(id: string | undefined): ParsedToolApprovalAction | null {
  if (!id) return null;
  const parts = id.split(':');
  if (parts[0] !== TOOL_APPROVAL_ACTION_PREFIX) return null;
  if (parts.length !== 4 && parts.length !== 6) return null;

  const verdict = parts[1];
  const toolUseIdsPart = parts[2];
  const turnId = parts[3];
  const isApprove = verdict === 'approve' || verdict === 'approve-tool' || verdict === 'approve-server';
  const isDeny = verdict === 'deny';

  if ((!isApprove && !isDeny) || !toolUseIdsPart || !turnId) return null;

  const toolUseIds = toolUseIdsPart.split(',').filter(Boolean);
  if (toolUseIds.length === 0) return null;

  const parsed: ParsedToolApprovalAction = {
    approved: isApprove,
    toolUseIds,
    turnId,
  };

  if (verdict === 'approve-tool') {
    parsed.persistScope = 'tool';
  }

  if (verdict === 'approve-server') {
    parsed.persistScope = 'server';
  }

  if (parts.length === 6) {
    parsed.toolName = decodeURIComponent(parts[4]) || undefined;
    parsed.mcpServerName = decodeURIComponent(parts[5]) || undefined;
  }

  return parsed;
}

export function buildToolApprovalPersistActionId(
  verdict: 'approve-tool' | 'approve-server',
  tool: PendingToolApproval,
  turnId: string
): string {
  const toolName = encodeURIComponent(tool.toolName);
  const mcpServerName = encodeURIComponent(tool.mcpServerName ?? '');

  return `${TOOL_APPROVAL_ACTION_PREFIX}:${verdict}:${tool.toolUseId}:${turnId}:${toolName}:${mcpServerName}`;
}

export function extractPendingToolApprovals(response: ThalamusResponse): PendingToolApproval[] {
  const actions = response.actionsRequired;
  if (!Array.isArray(actions) || actions.length === 0) {
    return [];
  }

  return actions.map((action: ActionRequired) => ({
    toolUseId: action.toolUseId,
    toolName: action.toolName,
    mcpServerName: action.type === 'mcp-approval' ? action.serverName : undefined,
    input: action.input,
  }));
}

export function formatToolLabelForApproval(tool: PendingToolApproval): string {
  const input = tool.input ? `: ${summariseInput(tool.input)}` : '';

  if (tool.mcpServerName) {
    return `${tool.mcpServerName} -> ${tool.toolName}${input}`;
  }

  return `${tool.toolName}${input}`;
}

export function buildToolApprovalCard(tool: PendingToolApproval, turnId: string): Record<string, unknown> {
  const toolLabel = formatToolLabelForApproval(tool);

  const children: Record<string, unknown>[] = [
    {
      type: 'actions',
      children: [
        {
          type: 'button',
          id: `${TOOL_APPROVAL_ACTION_PREFIX}:deny:${tool.toolUseId}:${turnId}`,
          label: 'Deny',
          style: 'default',
          value: toolLabel,
        },
        {
          type: 'button',
          id: `${TOOL_APPROVAL_ACTION_PREFIX}:approve:${tool.toolUseId}:${turnId}`,
          label: 'Approve once',
          style: 'primary',
          value: toolLabel,
        },
      ],
    },
    { type: 'divider' },
    {
      type: 'actions',
      children: [
        {
          type: 'button',
          id: buildToolApprovalPersistActionId('approve-tool', tool, turnId),
          label: 'Always allow this tool',
          style: 'default',
          value: toolLabel,
        },
        {
          type: 'button',
          id: buildToolApprovalPersistActionId('approve-server', tool, turnId),
          label: `Always allow ${tool.mcpServerName ?? 'MCP'}`,
          style: 'default',
          value: toolLabel,
        },
      ],
    },
  ];

  return {
    type: 'card',
    title: 'Tool approval required',
    subtitle: toolLabel,
    children,
  };
}

const SLACK_CARD_BODY_MAX = 200;

function formatToolSubtitle(tool: PendingToolApproval): string {
  if (tool.mcpServerName) {
    return `${tool.mcpServerName} · ${tool.toolName}`;
  }

  return tool.toolName;
}

function formatToolArgumentsBody(tool: PendingToolApproval): string | undefined {
  if (!tool.input || Object.keys(tool.input).length === 0) {
    return undefined;
  }

  const compact = JSON.stringify(tool.input);
  const body = `*Arguments*\n\`\`\`\n${compact}\n\`\`\``;

  if (body.length <= SLACK_CARD_BODY_MAX) {
    return body;
  }

  const truncatedJson = `${compact.slice(0, SLACK_CARD_BODY_MAX - 20)}…`;
  const truncatedBody = `*Arguments*\n\`\`\`\n${truncatedJson}\n\`\`\``;

  return truncatedBody.length <= SLACK_CARD_BODY_MAX ? truncatedBody : truncatedBody.slice(0, SLACK_CARD_BODY_MAX);
}

function buildToolApprovalSlackBlocks(tool: PendingToolApproval, turnId: string): SlackNativeDelivery {
  const argumentsBody = formatToolArgumentsBody(tool);
  const toolLabel = formatToolLabelForApproval(tool);

  const cardBlock: SlackCardBlock = {
    type: 'card',
    icon: {
      type: 'image',
      image_url: resolveSlackMcpIconUrl(tool.mcpServerName),
      alt_text: tool.mcpServerName ?? 'Tool',
    },
    title: { type: 'mrkdwn', text: 'Tool approval required', verbatim: false },
    subtitle: { type: 'mrkdwn', text: formatToolSubtitle(tool), verbatim: false },
    ...(argumentsBody ? { body: { type: 'mrkdwn', text: argumentsBody, verbatim: false } } : {}),
    actions: [
      {
        type: 'button',
        action_id: `${TOOL_APPROVAL_ACTION_PREFIX}:deny:${tool.toolUseId}:${turnId}`,
        value: toolLabel,
        text: { type: 'plain_text', text: 'Deny', emoji: false },
      },
      {
        type: 'button',
        style: 'primary',
        action_id: `${TOOL_APPROVAL_ACTION_PREFIX}:approve:${tool.toolUseId}:${turnId}`,
        value: toolLabel,
        text: { type: 'plain_text', text: 'Approve once', emoji: false },
      },
    ],
  };

  const alwaysAllowBlock: ActionsBlock = {
    type: 'actions',
    elements: [
      {
        type: 'button',
        action_id: buildToolApprovalPersistActionId('approve-tool', tool, turnId),
        value: toolLabel,
        text: {
          type: 'plain_text',
          text: 'Always allow this tool',
          emoji: false,
        },
      },
      {
        type: 'button',
        action_id: buildToolApprovalPersistActionId('approve-server', tool, turnId),
        value: toolLabel,
        text: {
          type: 'plain_text',
          text: `Always allow ${tool.mcpServerName ?? 'MCP'}`,
          emoji: false,
        },
      },
    ],
  };

  return {
    blocks: [cardBlock, alwaysAllowBlock],
    text: `Approve ${tool.toolName}?`,
  };
}

export function getToolApprovalCard(params: {
  platform?: string;
  tool: PendingToolApproval;
  turnId: string;
  pendingQueueTotal?: number;
}): ManagedCardDelivery {
  const card = buildToolApprovalCard(params.tool, params.turnId);
  const content: ReplyContentDto = { card };

  if (params.platform === AgentPlatformEnum.SLACK) {
    return {
      content,
      slackNative: buildToolApprovalSlackBlocks(params.tool, params.turnId),
    };
  }

  return { content };
}

function summariseInput(input: Record<string, unknown>): string {
  const firstValue = Object.values(input)[0];
  if (firstValue === undefined) return '';
  const text = typeof firstValue === 'string' ? firstValue : JSON.stringify(firstValue);

  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}
