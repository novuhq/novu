import type { PendingToolApproval } from '@novu/application-generic';
import type { ActionRequired, Response as ThalamusResponse } from '@novu/thalamus';
import type { SlackNativeDelivery } from '../../conversation-runtime/egress/slack-native-delivery';
import type { ReplyContentDto } from '../../shared/dtos/agent-reply-payload.dto';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import {
  buildToolApprovalActionId,
  DIRECT_TOOL_APPROVAL_ACTION_PREFIX,
  MCP_TOOL_APPROVAL_ACTION_PREFIX,
} from '../../shared/tool-approval/action-id';
import {
  type ApprovalCardSpec,
  buildToolApprovalCard,
  resolveDashboardBaseUrl,
  summariseToolInput,
} from '../../shared/tool-approval/tool-approval-card.builder';

const SLACK_CARD_BODY_MAX = 200;

export type ManagedCardDelivery = {
  content: ReplyContentDto;
  slackNative?: SlackNativeDelivery;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function summariseInputSuffix(tool: PendingToolApproval): string {
  return tool.input ? `: ${summariseToolInput(tool.input)}` : '';
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
// Persist ("always allow") action ids — kept in sync with parseToolApprovalActionId
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Thalamus adapter
// ---------------------------------------------------------------------------

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
// Spec mappers (MCP and direct are intentionally kept separate) + card assembly
// ---------------------------------------------------------------------------

function mcpToolApprovalSpec(tool: PendingToolApproval): ApprovalCardSpec {
  const toolLabel = mcpToolLabel(tool);

  return {
    title: 'Tool approval required',
    subtitlePortable: toolLabel,
    subtitleSlack: `${tool.mcpServerName} · ${tool.toolName}`,
    bodySlack: formatToolArgumentsBody(tool),
    slackText: `Approve ${tool.toolName}?`,
    icon: { fallbackName: tool.mcpServerName },
    deny: {
      id: buildToolApprovalActionId(MCP_TOOL_APPROVAL_ACTION_PREFIX, 'deny', tool.toolUseId),
      label: 'Deny',
      value: toolLabel,
    },
    approve: {
      id: buildToolApprovalActionId(MCP_TOOL_APPROVAL_ACTION_PREFIX, 'approve', tool.toolUseId),
      label: 'Approve once',
      value: toolLabel,
    },
    trust: {
      tool: {
        id: buildMcpToolApprovalPersistActionId('approve-tool', tool),
        label: 'Always allow this tool',
        value: toolLabel,
      },
      server: {
        id: buildMcpToolApprovalPersistActionId('approve-server', tool),
        label: `Always allow ${tool.mcpServerName}`,
        value: toolLabel,
      },
    },
  };
}

function directToolApprovalSpec(tool: PendingToolApproval): ApprovalCardSpec {
  const toolLabel = directToolLabel(tool);

  return {
    title: 'Tool approval required',
    subtitlePortable: toolLabel,
    subtitleSlack: tool.toolName,
    bodySlack: formatToolArgumentsBody(tool),
    slackText: `Approve ${tool.toolName}?`,
    icon: { fallbackName: undefined },
    deny: {
      id: buildToolApprovalActionId(DIRECT_TOOL_APPROVAL_ACTION_PREFIX, 'deny', tool.toolUseId),
      label: 'Deny',
      value: toolLabel,
    },
    approve: {
      id: buildToolApprovalActionId(DIRECT_TOOL_APPROVAL_ACTION_PREFIX, 'approve', tool.toolUseId),
      label: 'Approve once',
      value: toolLabel,
    },
    trust: {
      tool: { id: buildDirectToolApprovalPersistActionId(tool), label: 'Always allow this tool', value: toolLabel },
    },
  };
}

export function buildManagedApprovalCard(params: {
  platform?: string;
  tool: PendingToolApproval;
}): ManagedCardDelivery {
  const spec =
    params.tool.mcpServerName !== undefined ? mcpToolApprovalSpec(params.tool) : directToolApprovalSpec(params.tool);

  const { portable, slackNative } = buildToolApprovalCard(spec, { baseUrl: resolveDashboardBaseUrl() });
  const content: ReplyContentDto = { card: portable };

  if (params.platform === AgentPlatformEnum.SLACK) {
    return { content, slackNative };
  }

  return { content };
}
