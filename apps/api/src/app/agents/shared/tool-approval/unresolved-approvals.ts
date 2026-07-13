import {
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
} from '@novu/dal';

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

/**
 * Resolves the human participant whose message the agent was reacting to when
 * it proposed a given pending tool-approval request — i.e. whichever
 * participant's turn caused the tool call to be proposed in the first place.
 *
 * A conversation thread can have more than one human participant (e.g. a
 * group iMessage/SMS thread on Sendblue, or a shared Slack channel), so a
 * reply-based verdict cannot simply be trusted because it landed in the right
 * thread — it must come from the same participant the approval was implicitly
 * addressed to. This walks the ledger chronologically backwards from the
 * request and returns the `senderId` of the nearest preceding human message.
 *
 * Returns `null` when no human message precedes the request in the supplied
 * history. Callers must treat `null` as cannot-authorize (fail closed) — never
 * as permission to accept a verdict from any thread participant.
 */
export function resolveApprovalRequesterId(
  activities: ConversationActivityEntity[],
  request: ConversationActivityEntity
): string | null {
  const chronological = [...activities].reverse();
  const requestApprovalId = request.toolData?.approvalId;
  const requestIndex = chronological.findIndex(
    (activity) =>
      activity.type === ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST &&
      typeof requestApprovalId === 'string' &&
      activity.toolData?.approvalId === requestApprovalId
  );

  if (requestIndex === -1) {
    return null;
  }

  for (let i = requestIndex - 1; i >= 0; i -= 1) {
    const activity = chronological[i];
    const isHumanMessage =
      activity.type === ConversationActivityTypeEnum.MESSAGE &&
      (activity.senderType === ConversationActivitySenderTypeEnum.SUBSCRIBER ||
        activity.senderType === ConversationActivitySenderTypeEnum.PLATFORM_USER);

    if (isHumanMessage) {
      return activity.senderId;
    }
  }

  return null;
}
