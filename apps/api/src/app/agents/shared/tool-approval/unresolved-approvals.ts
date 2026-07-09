import { ConversationActivityEntity, ConversationActivityTypeEnum } from '@novu/dal';

/**
 * Scans a conversation's activity ledger (newest-first, as returned by
 * `AgentConversationService.getHistory`) and returns the tool-approval
 * requests that have neither a decision nor a tool result yet, in
 * chronological order (oldest first).
 */
export function findUnresolvedToolApprovalRequests(
  activities: ConversationActivityEntity[]
): ConversationActivityEntity[] {
  const chronological = [...activities].reverse();
  const decidedApprovalIds = new Set<string>();
  const resultToolCallIds = new Set<string>();

  for (const activity of chronological) {
    if (activity.type === ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION) {
      const approvalId = activity.toolData?.approvalId;
      if (typeof approvalId === 'string') {
        decidedApprovalIds.add(approvalId);
      }
    } else if (activity.type === ConversationActivityTypeEnum.TOOL_RESULT) {
      const toolCallId = activity.toolData?.toolCallId;
      if (typeof toolCallId === 'string') {
        resultToolCallIds.add(toolCallId);
      }
    }
  }

  const unresolved: ConversationActivityEntity[] = [];

  for (const activity of chronological) {
    if (activity.type !== ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST) {
      continue;
    }

    const approvalId = activity.toolData?.approvalId;
    const toolCallId = activity.toolData?.toolCallId;
    if (typeof approvalId !== 'string' || typeof toolCallId !== 'string') {
      continue;
    }

    if (decidedApprovalIds.has(approvalId) || resultToolCallIds.has(toolCallId)) {
      continue;
    }

    unresolved.push(activity);
  }

  return unresolved;
}
