import { ConversationActivityDto } from '@/api/conversations';

const RUN_LIFECYCLE_ACTIVITY_TYPES = new Set(['run_start', 'run_finish', 'run_error']);

function isRunLifecycleActivityType(type: string): boolean {
  return RUN_LIFECYCLE_ACTIVITY_TYPES.has(type);
}

function buildApprovalCardMessageIds(activities: ConversationActivityDto[]): Set<string> {
  const ids = new Set<string>();

  for (const activity of activities) {
    if (activity.type === 'tool_approval_request' && activity.platformMessageId) {
      ids.add(activity.platformMessageId);
    }
  }

  return ids;
}

/**
 * Ledger rows we intentionally omit from the dashboard timeline.
 * They may still exist for runtime history (e.g. tool_result) or managed plan cards (tool-use).
 */
function isHiddenTimelineActivity(activity: ConversationActivityDto, approvalCardMessageIds: Set<string>): boolean {
  if (activity.type === 'tool_result') {
    return true;
  }

  if (isRunLifecycleActivityType(activity.type)) {
    return true;
  }

  if (activity.type === 'signal' && activity.signalData?.type === 'tool-use') {
    return true;
  }

  if (activity.type !== 'message' || activity.senderType !== 'agent' || !activity.platformMessageId) {
    return false;
  }

  return approvalCardMessageIds.has(activity.platformMessageId);
}

export function getTimelineLabel(activity: ConversationActivityDto): string {
  if (activity.type === 'edit') {
    return `Card updated: ${activity.content}`;
  }

  return activity.content;
}

export function groupActivitiesForTimeline(activities: ConversationActivityDto[]): ConversationActivityDto[] {
  const approvalCardMessageIds = buildApprovalCardMessageIds(activities);

  return activities.filter((activity) => !isHiddenTimelineActivity(activity, approvalCardMessageIds));
}
