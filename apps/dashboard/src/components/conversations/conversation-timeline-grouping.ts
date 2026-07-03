import { ConversationActivityDto } from '@/api/conversations';

export type TimelineEntry =
  | { type: 'single'; key: string; activity: ConversationActivityDto }
  | { type: 'tool-progress'; key: string; activities: ConversationActivityDto[] }
  | { type: 'tool-approval-cycle'; key: string; request: ConversationActivityDto; events: ConversationActivityDto[] };

const CYCLE_EVENT_TYPES = new Set<ConversationActivityDto['type']>(['tool_approval_decision', 'tool_result', 'edit']);

type ApprovalIndex = {
  byApprovalId: Map<string, ConversationActivityDto>;
  byToolCallId: Map<string, ConversationActivityDto>;
  byPlatformMessageId: Map<string, ConversationActivityDto>;
};

function compareByCreatedAt(a: ConversationActivityDto, b: ConversationActivityDto): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function isToolUseSignal(activity: ConversationActivityDto): boolean {
  return activity.type === 'signal' && activity.signalData?.type === 'tool-use';
}

function buildApprovalIndex(activities: ConversationActivityDto[]): ApprovalIndex {
  const index: ApprovalIndex = {
    byApprovalId: new Map(),
    byToolCallId: new Map(),
    byPlatformMessageId: new Map(),
  };

  for (const activity of activities) {
    if (activity.type !== 'tool_approval_request') {
      continue;
    }

    const { approvalId, toolCallId } = activity.toolData ?? {};

    if (approvalId) {
      index.byApprovalId.set(approvalId, activity);
    }

    if (toolCallId) {
      index.byToolCallId.set(toolCallId, activity);
    }

    if (activity.platformMessageId) {
      index.byPlatformMessageId.set(activity.platformMessageId, activity);
    }
  }

  return index;
}

function findParentRequest(event: ConversationActivityDto, index: ApprovalIndex): ConversationActivityDto | undefined {
  switch (event.type) {
    case 'tool_approval_decision': {
      const approvalId = event.toolData?.approvalId;

      return approvalId ? index.byApprovalId.get(approvalId) : undefined;
    }
    case 'tool_result': {
      const toolCallId = event.toolData?.toolCallId;

      return toolCallId ? index.byToolCallId.get(toolCallId) : undefined;
    }
    case 'edit': {
      const platformMessageId = event.platformMessageId;

      return platformMessageId ? index.byPlatformMessageId.get(platformMessageId) : undefined;
    }
    default:
      return undefined;
  }
}

function groupCycleEvents(
  activities: ConversationActivityDto[],
  index: ApprovalIndex
): { byRequestId: Map<string, ConversationActivityDto[]>; consumedIds: Set<string> } {
  const byRequestId = new Map<string, ConversationActivityDto[]>();
  const consumedIds = new Set<string>();

  for (const event of activities) {
    if (!CYCLE_EVENT_TYPES.has(event.type)) {
      continue;
    }

    const parent = findParentRequest(event, index);
    if (!parent) {
      continue;
    }

    const siblings = byRequestId.get(parent._id);
    if (siblings) {
      siblings.push(event);
    } else {
      byRequestId.set(parent._id, [event]);
    }

    consumedIds.add(event._id);
  }

  for (const events of byRequestId.values()) {
    events.sort(compareByCreatedAt);
  }

  return { byRequestId, consumedIds };
}

export function getCycleEventLabel(activity: ConversationActivityDto): string {
  if (activity.type === 'edit') {
    return `Card updated: ${activity.content}`;
  }

  return activity.content;
}

export function groupActivitiesForTimeline(activities: ConversationActivityDto[]): TimelineEntry[] {
  const { byRequestId, consumedIds } = groupCycleEvents(activities, buildApprovalIndex(activities));
  const toolGroups = new Map<string, ConversationActivityDto[]>();
  const entries: TimelineEntry[] = [];

  for (const activity of activities) {
    if (isToolUseSignal(activity)) {
      const runId = String((activity.signalData?.payload as Record<string, unknown>)?.runId ?? '');
      if (!runId) {
        entries.push({ type: 'single', key: activity._id, activity });
        continue;
      }

      const existingGroup = toolGroups.get(runId);
      if (existingGroup) {
        existingGroup.push(activity);
        continue;
      }

      const group = [activity];
      toolGroups.set(runId, group);
      entries.push({ type: 'tool-progress', key: `tools-${runId}`, activities: group });
      continue;
    }

    if (activity.type === 'tool_approval_request') {
      entries.push({
        type: 'tool-approval-cycle',
        key: activity._id,
        request: activity,
        events: byRequestId.get(activity._id) ?? [],
      });
      continue;
    }

    if (consumedIds.has(activity._id)) {
      continue;
    }

    entries.push({ type: 'single', key: activity._id, activity });
  }

  return entries;
}
