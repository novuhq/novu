import type { PendingToolApproval } from '@novu/application-generic';
import { getMcpIconUrl, MCP_ICON_DEFAULT_ID, resolveMcpCatalogIdByName } from '@novu/shared';
import type { ActionRequired, Response as ThalamusResponse } from '@novu/thalamus';
import type { ActionsBlock, Block } from '@slack/types';
import type { SlackNativeDelivery } from '../../conversation-runtime/egress/slack-native-delivery';
import type { ReplyContentDto } from '../../shared/dtos/agent-reply-payload.dto';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

const MCP_TOOL_APPROVAL_ACTION_PREFIX = 'mcp-approval' as const;
const DIRECT_TOOL_APPROVAL_ACTION_PREFIX = 'direct-approval' as const;

type ToolApprovalActionPrefix = typeof MCP_TOOL_APPROVAL_ACTION_PREFIX | typeof DIRECT_TOOL_APPROVAL_ACTION_PREFIX;

const SLACK_CARD_BODY_MAX = 200;

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function summariseInput(input: Record<string, unknown>): string {
  const firstValue = Object.values(input)[0];
  if (firstValue === undefined) return '';
  const text = typeof firstValue === 'string' ? firstValue : JSON.stringify(firstValue);

  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

function summariseInputSuffix(tool: PendingToolApproval): string {
  return tool.input ? `: ${summariseInput(tool.input)}` : '';
}

function mcpToolLabel(tool: PendingToolApproval): string {
  return `${tool.mcpServerName} -> ${tool.toolName}${summariseInputSuffix(tool)}`;
}

function directToolLabel(tool: PendingToolApproval): string {
  return `${tool.toolName}${summariseInputSuffix(tool)}`;
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

// ---------------------------------------------------------------------------
// Action id grammar (kept in sync with parseToolApprovalActionId)
// ---------------------------------------------------------------------------

export type ToolTrustTarget =
  | { scope: 'tool'; toolName: string; mcpServerName?: string }
  | { scope: 'server'; mcpServerName: string };

export type ParsedToolApprovalAction = {
  toolUseId: string;
  approved: boolean;
  trust?: ToolTrustTarget;
};

function buildToolApprovalActionId(
  prefix: ToolApprovalActionPrefix,
  verdict: 'approve' | 'deny',
  toolUseId: string
): string {
  return `${prefix}:${verdict}:${toolUseId}`;
}

function buildMcpToolApprovalPersistActionId(
  verdict: 'approve-tool' | 'approve-server',
  tool: PendingToolApproval
): string {
  const toolName = encodeURIComponent(tool.toolName);
  const mcpServerName = encodeURIComponent(tool.mcpServerName ?? '');

  return `${MCP_TOOL_APPROVAL_ACTION_PREFIX}:${verdict}:${tool.toolUseId}:${toolName}:${mcpServerName}`;
}

function buildDirectToolApprovalPersistActionId(tool: PendingToolApproval): string {
  const toolName = encodeURIComponent(tool.toolName);

  return `${DIRECT_TOOL_APPROVAL_ACTION_PREFIX}:approve-tool:${tool.toolUseId}:${toolName}`;
}

const TOOL_APPROVAL_VERDICTS = ['approve', 'deny', 'approve-tool', 'approve-server'] as const;
type ToolApprovalVerdict = (typeof TOOL_APPROVAL_VERDICTS)[number];

function isToolApprovalPrefix(value: string | undefined): value is ToolApprovalActionPrefix {
  return value === MCP_TOOL_APPROVAL_ACTION_PREFIX || value === DIRECT_TOOL_APPROVAL_ACTION_PREFIX;
}

function isToolApprovalVerdict(value: string | undefined): value is ToolApprovalVerdict {
  return TOOL_APPROVAL_VERDICTS.includes(value as ToolApprovalVerdict);
}

function decodeSegment(segment: string | undefined): string | undefined {
  if (!segment) {
    return undefined;
  }

  try {
    return decodeURIComponent(segment) || undefined;
  } catch {
    // Malformed percent-encoding: ignore the segment rather than throwing and
    // breaking the whole approval action handler.
    return undefined;
  }
}

/**
 * Action ids are colon-joined: `{prefix}:{verdict}:{toolUseId}[:{toolName}[:{mcpServerName}]]`.
 * `toolName` / `mcpServerName` are URL-encoded, so they never contain a colon.
 */
export function parseToolApprovalActionId(id: string | undefined): ParsedToolApprovalAction | null {
  const [prefix, verdict, toolUseId, rawToolName, rawServerName, ...rest] = (id ?? '').split(':');

  if (rest.length > 0 || !isToolApprovalPrefix(prefix) || !isToolApprovalVerdict(verdict) || !toolUseId) {
    return null;
  }

  const toolName = decodeSegment(rawToolName);
  const mcpServerName = decodeSegment(rawServerName);
  const approved = verdict !== 'deny';
  // The trust *source* is bound to the action prefix, never inferred from the
  // segments present. This prevents a forged/mismatched action id (e.g. a
  // direct prefix with `approve-server`) from persisting MCP server-wide trust.
  const isMcp = prefix === MCP_TOOL_APPROVAL_ACTION_PREFIX;

  switch (verdict) {
    case 'approve':
    case 'deny':
      return { toolUseId, approved };
    // Persist verdicts are only ever emitted by our cards with all required
    // segments present. A missing/undecodable segment therefore means a
    // malformed or forged id, so we reject it (fail closed: no approval, no
    // persist) rather than downgrading it to a one-off approval.
    case 'approve-tool': {
      // MCP per-tool trust must carry its server; direct tool trust must not.
      if (isMcp) {
        if (!toolName || !mcpServerName) {
          return null;
        }

        return { toolUseId, approved, trust: { scope: 'tool', toolName, mcpServerName } };
      }

      if (!toolName) {
        return null;
      }

      return { toolUseId, approved, trust: { scope: 'tool', toolName } };
    }
    case 'approve-server': {
      // Server-wide trust only exists on MCP cards.
      if (!isMcp || !mcpServerName) {
        return null;
      }

      return { toolUseId, approved, trust: { scope: 'server', mcpServerName } };
    }
    default: {
      const exhaustive: never = verdict;
      throw new Error(`Unhandled tool approval verdict: ${exhaustive}`);
    }
  }
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

// ---------------------------------------------------------------------------
// Card builders (MCP and direct are intentionally kept separate)
// ---------------------------------------------------------------------------

function buildMcpToolApprovalCard(tool: PendingToolApproval): Record<string, unknown> {
  const toolLabel = mcpToolLabel(tool);

  const children: Record<string, unknown>[] = [
    {
      type: 'actions',
      children: [
        {
          type: 'button',
          id: buildToolApprovalActionId(MCP_TOOL_APPROVAL_ACTION_PREFIX, 'deny', tool.toolUseId),
          label: 'Deny',
          style: 'default',
          value: toolLabel,
        },
        {
          type: 'button',
          id: buildToolApprovalActionId(MCP_TOOL_APPROVAL_ACTION_PREFIX, 'approve', tool.toolUseId),
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
          id: buildMcpToolApprovalPersistActionId('approve-tool', tool),
          label: 'Always allow this tool',
          style: 'default',
          value: toolLabel,
        },
        {
          type: 'button',
          id: buildMcpToolApprovalPersistActionId('approve-server', tool),
          label: `Always allow ${tool.mcpServerName}`,
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

function buildDirectToolApprovalCard(tool: PendingToolApproval): Record<string, unknown> {
  const toolLabel = directToolLabel(tool);

  const children: Record<string, unknown>[] = [
    {
      type: 'actions',
      children: [
        {
          type: 'button',
          id: buildToolApprovalActionId(DIRECT_TOOL_APPROVAL_ACTION_PREFIX, 'deny', tool.toolUseId),
          label: 'Deny',
          style: 'default',
          value: toolLabel,
        },
        {
          type: 'button',
          id: buildToolApprovalActionId(DIRECT_TOOL_APPROVAL_ACTION_PREFIX, 'approve', tool.toolUseId),
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
          id: buildDirectToolApprovalPersistActionId(tool),
          label: 'Always allow this tool',
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

function buildMcpToolApprovalSlackBlocks(tool: PendingToolApproval): SlackNativeDelivery {
  const argumentsBody = formatToolArgumentsBody(tool);
  const toolLabel = mcpToolLabel(tool);

  const cardBlock: SlackCardBlock = {
    type: 'card',
    icon: {
      type: 'image',
      image_url: resolveSlackMcpIconUrl(tool.mcpServerName),
      alt_text: tool.mcpServerName ?? 'Tool',
    },
    title: { type: 'mrkdwn', text: 'Tool approval required', verbatim: false },
    subtitle: { type: 'mrkdwn', text: `${tool.mcpServerName} · ${tool.toolName}`, verbatim: false },
    ...(argumentsBody ? { body: { type: 'mrkdwn', text: argumentsBody, verbatim: false } } : {}),
    actions: [
      {
        type: 'button',
        action_id: buildToolApprovalActionId(MCP_TOOL_APPROVAL_ACTION_PREFIX, 'deny', tool.toolUseId),
        value: toolLabel,
        text: { type: 'plain_text', text: 'Deny', emoji: false },
      },
      {
        type: 'button',
        style: 'primary',
        action_id: buildToolApprovalActionId(MCP_TOOL_APPROVAL_ACTION_PREFIX, 'approve', tool.toolUseId),
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
        action_id: buildMcpToolApprovalPersistActionId('approve-tool', tool),
        value: toolLabel,
        text: { type: 'plain_text', text: 'Always allow this tool', emoji: false },
      },
      {
        type: 'button',
        action_id: buildMcpToolApprovalPersistActionId('approve-server', tool),
        value: toolLabel,
        text: { type: 'plain_text', text: `Always allow ${tool.mcpServerName}`, emoji: false },
      },
    ],
  };

  return {
    blocks: [cardBlock, alwaysAllowBlock],
    text: `Approve ${tool.toolName}?`,
  };
}

function buildDirectToolApprovalSlackBlocks(tool: PendingToolApproval): SlackNativeDelivery {
  const argumentsBody = formatToolArgumentsBody(tool);
  const toolLabel = directToolLabel(tool);

  const cardBlock: SlackCardBlock = {
    type: 'card',
    icon: {
      type: 'image',
      image_url: resolveSlackMcpIconUrl(undefined),
      alt_text: 'Tool',
    },
    title: { type: 'mrkdwn', text: 'Tool approval required', verbatim: false },
    subtitle: { type: 'mrkdwn', text: tool.toolName, verbatim: false },
    ...(argumentsBody ? { body: { type: 'mrkdwn', text: argumentsBody, verbatim: false } } : {}),
    actions: [
      {
        type: 'button',
        action_id: buildToolApprovalActionId(DIRECT_TOOL_APPROVAL_ACTION_PREFIX, 'deny', tool.toolUseId),
        value: toolLabel,
        text: { type: 'plain_text', text: 'Deny', emoji: false },
      },
      {
        type: 'button',
        style: 'primary',
        action_id: buildToolApprovalActionId(DIRECT_TOOL_APPROVAL_ACTION_PREFIX, 'approve', tool.toolUseId),
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
        action_id: buildDirectToolApprovalPersistActionId(tool),
        value: toolLabel,
        text: { type: 'plain_text', text: 'Always allow this tool', emoji: false },
      },
    ],
  };

  return {
    blocks: [cardBlock, alwaysAllowBlock],
    text: `Approve ${tool.toolName}?`,
  };
}

export function getToolApprovalCard(params: { platform?: string; tool: PendingToolApproval }): ManagedCardDelivery {
  const isMcpTool = params.tool.mcpServerName !== undefined;

  if (isMcpTool) {
    const content: ReplyContentDto = { card: buildMcpToolApprovalCard(params.tool) };

    if (params.platform === AgentPlatformEnum.SLACK) {
      return { content, slackNative: buildMcpToolApprovalSlackBlocks(params.tool) };
    }

    return { content };
  }

  const content: ReplyContentDto = { card: buildDirectToolApprovalCard(params.tool) };

  if (params.platform === AgentPlatformEnum.SLACK) {
    return { content, slackNative: buildDirectToolApprovalSlackBlocks(params.tool) };
  }

  return { content };
}
