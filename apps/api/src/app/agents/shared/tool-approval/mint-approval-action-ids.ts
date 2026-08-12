import { buildApprovalActionId } from '@novu/framework/internal';
import {
  buildToolApprovalActionId,
  DIRECT_TOOL_APPROVAL_ACTION_PREFIX,
  MCP_TOOL_APPROVAL_ACTION_PREFIX,
  type ToolApprovalActionPrefix,
} from './action-id';

export type ApprovalActionIdGrammar = { kind: 'self-hosted' } | { kind: 'managed'; prefix: ToolApprovalActionPrefix };

export type MintedApprovalActionIds = {
  approveActionId: string;
  denyActionId: string;
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
