import { ConversationActivityDto, ConversationHumanInteractionData } from '@/api/conversations';

export type HitlOverviewState = {
  title: string;
  detail: string;
  isPending: boolean;
};

const HITL_REQUEST_TYPES = new Set(['tool_approval_request', 'human_interaction_request']);
const HITL_RESPONSE_TYPES = new Set(['tool_approval_decision', 'human_interaction_response']);

export function isHitlTimelineActivity(activity: ConversationActivityDto): boolean {
  return HITL_REQUEST_TYPES.has(activity.type) || HITL_RESPONSE_TYPES.has(activity.type);
}

export function getHumanInteraction(activity: ConversationActivityDto): ConversationHumanInteractionData | undefined {
  return activity.richContent?.humanInteraction;
}

export function formatToolInputPreview(input: Record<string, unknown> | undefined): string {
  if (!input || Object.keys(input).length === 0) {
    return '{}';
  }

  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

export function getHitlTimelineLabel(activity: ConversationActivityDto): string {
  if (activity.type === 'tool_approval_request') {
    const toolName = activity.toolData?.toolName ?? 'tool';

    return `Tool approval required: ${toolName}`;
  }

  if (activity.type === 'tool_approval_decision') {
    const toolName = activity.toolData?.toolName ?? 'tool';
    const actor = activity.senderName ?? activity.senderId;
    const approved = activity.toolData?.approved;

    if (approved) {
      return `Approved ${toolName} · ${actor}`;
    }

    return `Denied ${toolName} · ${actor}`;
  }

  const human = getHumanInteraction(activity);
  const title = human?.title ?? activity.content;

  if (activity.type === 'human_interaction_request') {
    switch (human?.kind) {
      case 'ask':
        return `Waiting for answer: ${title}`;
      case 'choose':
        return `Choice required: ${title}`;
      case 'tell':
        return `Notice sent: ${title}`;
      case 'approve':
        return `Approval required: ${title}`;
      default:
        return activity.content || `Human input required: ${title}`;
    }
  }

  if (activity.type === 'human_interaction_response') {
    const actor = activity.senderName ?? activity.senderId;

    switch (human?.status) {
      case 'approved':
        return `Approved by ${actor}`;
      case 'denied':
        return `Denied by ${actor}`;
      case 'answered':
        return human.text?.trim() ? `Answered by ${actor}: ${human.text.trim()}` : `Answered by ${actor}`;
      case 'expired':
        return `Expired: ${title}`;
      case 'canceled':
        return `Canceled: ${title}`;
      case 'delivered':
        return `Delivered: ${title}`;
      default:
        return activity.content;
    }
  }

  return activity.content;
}

export function getHitlOverviewState(activities: ConversationActivityDto[]): HitlOverviewState | null {
  const hitlActivities = activities.filter(isHitlTimelineActivity);
  if (hitlActivities.length === 0) {
    return null;
  }

  const decidedApprovalIds = new Set(
    hitlActivities
      .filter((activity) => activity.type === 'tool_approval_decision' && activity.toolData?.approvalId)
      .map((activity) => activity.toolData?.approvalId as string)
  );
  const settledInteractionIds = new Set(
    hitlActivities
      .filter((activity) => activity.type === 'human_interaction_response')
      .map((activity) => getHumanInteraction(activity)?.interactionIdentifier)
      .filter((id): id is string => Boolean(id))
  );

  const pending = [...hitlActivities].reverse().find((activity) => {
    if (activity.type === 'tool_approval_request') {
      const approvalId = activity.toolData?.approvalId;

      return Boolean(approvalId && !decidedApprovalIds.has(approvalId));
    }

    if (activity.type === 'human_interaction_request') {
      const interactionIdentifier = getHumanInteraction(activity)?.interactionIdentifier;

      return Boolean(interactionIdentifier && !settledInteractionIds.has(interactionIdentifier));
    }

    return false;
  });

  if (pending) {
    return {
      title: getHitlTimelineLabel(pending),
      detail: 'Waiting for a human response',
      isPending: true,
    };
  }

  const latestResponse = [...hitlActivities].reverse().find((activity) => HITL_RESPONSE_TYPES.has(activity.type));

  if (!latestResponse) {
    return null;
  }

  return {
    title: getHitlTimelineLabel(latestResponse),
    detail: latestResponse.senderName ?? latestResponse.senderId,
    isPending: false,
  };
}
