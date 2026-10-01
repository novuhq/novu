import type { ToolApprovalOption } from '@assistant-ui/react';
import type { AgentToolApprovalDecision } from '@novu/react';

export const APPROVAL_OPTIONS = {
  denied: { id: 'denied', kind: 'reject-once', label: 'Deny' },
  approved: { id: 'approved', kind: 'allow-once', label: 'Approve once' },
  'trust-tool': { id: 'trust-tool', kind: 'allow-always', label: 'Always allow this tool' },
  'trust-server': { id: 'trust-server', kind: 'allow-always', label: 'Always allow server' },
} as const satisfies Record<AgentToolApprovalDecision, ToolApprovalOption>;

export function isApprovalOptionId(id: string): id is AgentToolApprovalDecision {
  return Object.hasOwn(APPROVAL_OPTIONS, id);
}

export function decisionFromApprovalOption(
  optionId: string | undefined,
  approved: boolean,
): AgentToolApprovalDecision {
  if (optionId && isApprovalOptionId(optionId)) {
    return optionId;
  }

  if (optionId) {
    throw new Error(`Unknown approval option id: ${optionId}`);
  }

  return approved ? 'approved' : 'denied';
}
