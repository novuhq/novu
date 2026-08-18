import { buildApprovalActionId } from '@novu/framework/internal';
import {
  buildDirectToolApprovalPersistActionId,
  buildMcpToolApprovalPersistActionId,
  buildToolApprovalActionId,
  DIRECT_TOOL_APPROVAL_ACTION_PREFIX,
  MCP_TOOL_APPROVAL_ACTION_PREFIX,
  type ToolApprovalActionPrefix,
  type ToolApprovalPersistTarget,
} from './action-id';

export type ApprovalActionIdGrammar = { kind: 'self-hosted' } | { kind: 'managed'; prefix: ToolApprovalActionPrefix };

export type MintedApprovalActionIds = {
  approveActionId: string;
  denyActionId: string;
};

export type MintedManagedApprovalActionIds = MintedApprovalActionIds & {
  trustToolActionId: string;
  trustServerActionId?: string;
};

/**
 * Mint the same action-id grammar Slack/Teams cards already put on buttons.
 * Self-hosted: `tool-approval:{approve|deny}:{approvalId}`
 * Managed: `mcp-approval|direct-approval:{approve|deny}:{toolUseId}` (approvalId === toolUseId).
 */
export function mintApprovalActionIds(params: {
  approvalId: string;
  grammar?: ApprovalActionIdGrammar;
}): MintedApprovalActionIds {
  const grammar = params.grammar ?? { kind: 'self-hosted' };

  if (grammar.kind === 'managed') {
    return {
      approveActionId: buildToolApprovalActionId(grammar.prefix, 'approve', params.approvalId),
      denyActionId: buildToolApprovalActionId(grammar.prefix, 'deny', params.approvalId),
    };
  }

  return {
    approveActionId: buildApprovalActionId('approve', params.approvalId),
    denyActionId: buildApprovalActionId('deny', params.approvalId),
  };
}

export function managedApprovalGrammar(mcpServerName: string | undefined): ApprovalActionIdGrammar {
  return {
    kind: 'managed',
    prefix: mcpServerName !== undefined ? MCP_TOOL_APPROVAL_ACTION_PREFIX : DIRECT_TOOL_APPROVAL_ACTION_PREFIX,
  };
}

/**
 * Mint all four managed approval action ids (approve once, deny, always-allow tool, always-allow server).
 * Same ids Slack/Teams cards put on buttons — Agent Chat protocol reuses them.
 */
export function mintManagedApprovalActionIds(tool: ToolApprovalPersistTarget): MintedManagedApprovalActionIds {
  const base = mintApprovalActionIds({
    approvalId: tool.toolUseId,
    grammar: managedApprovalGrammar(tool.mcpServerName),
  });
  const isMcp = tool.mcpServerName !== undefined;

  return {
    ...base,
    trustToolActionId: isMcp
      ? buildMcpToolApprovalPersistActionId('approve-tool', tool)
      : buildDirectToolApprovalPersistActionId(tool),
    ...(isMcp ? { trustServerActionId: buildMcpToolApprovalPersistActionId('approve-server', tool) } : {}),
  };
}
