import type { PendingToolApproval } from '@novu/application-generic';
import type { ActionRequired, Response as ThalamusResponse } from '@novu/thalamus';

export const TOOL_APPROVAL_ACTION_PREFIX = 'mcp-approval' as const;

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

function buildPersistTrustActionId(
  verdict: 'approve-tool' | 'approve-server',
  tool: PendingToolApproval,
  turnId: string
): string {
  const toolName = encodeURIComponent(tool.toolName);
  const mcpServerName = encodeURIComponent(tool.mcpServerName ?? '');

  return `${TOOL_APPROVAL_ACTION_PREFIX}:${verdict}:${tool.toolUseId}:${turnId}:${toolName}:${mcpServerName}`;
}

export function isLinkButtonActionId(id: string | undefined): boolean {
  return typeof id === 'string' && id.startsWith('link-');
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

function formatToolLabel(t: PendingToolApproval): string {
  const name = t.mcpServerName ? `${t.toolName} from ${t.mcpServerName}` : t.toolName;
  const input = t.input ? `: ${summariseInput(t.input)}` : '';

  return `${name}${input}`;
}

export function buildToolApprovalCard(pendingTools: PendingToolApproval[], turnId: string): Record<string, unknown> {
  const tool = pendingTools[0];
  const serverLabel = tool.mcpServerName ? ` from ${tool.mcpServerName}` : '';
  const toolLabel = formatToolLabel(tool);
  const mcpDisplayName = tool.mcpServerName ?? 'MCP';

  const inputSummary = tool.input ? summariseInput(tool.input) : '';
  const description = inputSummary
    ? `I'd like to call \`${tool.toolName}\`${serverLabel}:\n\`\`\`\n${inputSummary}\n\`\`\``
    : `I'd like to call \`${tool.toolName}\`${serverLabel}.`;

  const children: Record<string, unknown>[] = [{ type: 'text', content: description }];

  children.push(
    { type: 'divider' },
    {
      type: 'actions',
      children: [
        {
          type: 'button',
          id: `${TOOL_APPROVAL_ACTION_PREFIX}:approve:${tool.toolUseId}:${turnId}`,
          label: 'Approve',
          style: 'primary',
          value: toolLabel,
        },
        {
          type: 'button',
          id: `${TOOL_APPROVAL_ACTION_PREFIX}:deny:${tool.toolUseId}:${turnId}`,
          label: 'Deny',
          style: 'danger',
          value: toolLabel,
        },
      ],
    }
  );

  if (pendingTools.length === 1) {
    children.push(
      { type: 'divider' },
      {
        type: 'actions',
        children: [
          {
            type: 'button',
            id: buildPersistTrustActionId('approve-tool', tool, turnId),
            label: `Approve & always allow ${tool.toolName}`,
            style: 'default',
            value: toolLabel,
          },
          {
            type: 'button',
            id: buildPersistTrustActionId('approve-server', tool, turnId),
            label: `Approve & always allow all ${mcpDisplayName} tools`,
            style: 'default',
            value: toolLabel,
          },
        ],
      }
    );
  }

  if (pendingTools.length > 1) {
    const allIds = pendingTools.map((t) => t.toolUseId).join(',');
    const allLabels = pendingTools.map((t) => formatToolLabel(t)).join('\n');
    children.push({
      type: 'actions',
      children: [
        {
          type: 'button',
          id: `${TOOL_APPROVAL_ACTION_PREFIX}:approve:${allIds}:${turnId}`,
          label: `Approve All (${pendingTools.length})`,
          style: 'primary',
          value: allLabels,
        },
        {
          type: 'button',
          id: `${TOOL_APPROVAL_ACTION_PREFIX}:deny:${allIds}:${turnId}`,
          label: `Deny All (${pendingTools.length})`,
          style: 'danger',
          value: allLabels,
        },
      ],
    });
  }

  return {
    type: 'card',
    title: 'Tool Approval',
    children,
  };
}

export function buildToolApprovalVerdictCard(
  approved: boolean,
  toolCount: number,
  toolDescription?: string
): Record<string, unknown> {
  const emoji = approved ? '✅' : '🚫';
  const verb = approved ? 'Approved' : 'Denied';
  const suffix = toolCount > 1 ? ` all ${toolCount} tools` : '';
  const subtitle = toolDescription || undefined;

  return {
    type: 'card',
    title: 'Tool Approval',
    subtitle,
    children: [{ type: 'text', content: `${emoji}  ${verb}${suffix}` }],
  };
}

function summariseInput(input: Record<string, unknown>): string {
  const firstValue = Object.values(input)[0];
  if (firstValue === undefined) return '';
  const text = typeof firstValue === 'string' ? firstValue : JSON.stringify(firstValue);

  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}
