import {
  AGENT_EVENT_PROTOCOL_VERSION,
  type AgentEvent,
  type AgentEventEnvelope,
  type AgentFileRef,
  isDeltaEvent,
} from '@novu/agent-event-protocol';
import {
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  type ConversationEventActivityFilter,
} from '@novu/dal';
import { mintApprovalActionIds } from '../shared/tool-approval/mint-approval-action-ids';

/**
 * Which durable activities the web-chat history surface exposes as events.
 * Must stay in lockstep with `mapActivityToEvent` below.
 */
export const WEB_CHAT_EVENT_ACTIVITY_FILTER: ConversationEventActivityFilter = {
  messageSenderTypes: [ConversationActivitySenderTypeEnum.AGENT, ConversationActivitySenderTypeEnum.SUBSCRIBER],
  eventTypes: [
    ConversationActivityTypeEnum.EDIT,
    ConversationActivityTypeEnum.DELETE,
    ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST,
    ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION,
    ConversationActivityTypeEnum.TOOL_RESULT,
  ],
};

function filesFromRichContent(richContent?: Record<string, unknown>) {
  const files = richContent?.files;
  if (!Array.isArray(files) || files.length === 0) {
    return undefined;
  }

  return files as AgentFileRef[];
}

const MESSAGE_ROLE_BY_SENDER = {
  [ConversationActivitySenderTypeEnum.AGENT]: 'assistant',
  [ConversationActivitySenderTypeEnum.SUBSCRIBER]: 'user',
} as const;

function mapActivityToEvent(activity: ConversationActivityEntity): AgentEvent | null {
  switch (activity.type) {
    case ConversationActivityTypeEnum.MESSAGE: {
      const role = MESSAGE_ROLE_BY_SENDER[activity.senderType as keyof typeof MESSAGE_ROLE_BY_SENDER];
      if (!role) {
        return null;
      }

      return {
        type: 'message',
        role,
        // Browser-visible id is platformMessageId (aligned with live WS envelopes).
        messageId: activity.platformMessageId ?? activity.identifier,
        content: { markdown: activity.content },
        files: filesFromRichContent(activity.richContent),
      };
    }

    case ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST: {
      const toolData = activity.toolData;
      if (!toolData?.approvalId || !toolData.toolCallId || !toolData.toolName) {
        return null;
      }

      const actionIds =
        toolData.approveActionId && toolData.denyActionId
          ? { approveActionId: toolData.approveActionId, denyActionId: toolData.denyActionId }
          : mintApprovalActionIds({ approvalId: toolData.approvalId });

      return {
        type: 'tool-approval-request',
        approvalId: toolData.approvalId,
        toolUseId: toolData.toolCallId,
        toolName: toolData.toolName,
        input: toolData.input,
        approveActionId: actionIds.approveActionId,
        denyActionId: actionIds.denyActionId,
      };
    }

    case ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION: {
      const toolData = activity.toolData;
      if (!toolData?.approvalId) {
        return null;
      }

      return {
        type: 'tool-approval-response',
        approvalId: toolData.approvalId,
        decision: toolData.approved ? 'approved' : 'denied',
      };
    }

    case ConversationActivityTypeEnum.TOOL_RESULT: {
      const toolData = activity.toolData;
      if (!toolData?.toolCallId) {
        return null;
      }

      return {
        type: 'tool-use-result',
        toolUseId: toolData.toolCallId,
        content: [{ type: 'text', text: String(toolData.output ?? activity.content) }],
      };
    }

    case ConversationActivityTypeEnum.EDIT:
      return {
        type: 'channel.edit',
        messageId: activity.platformMessageId ?? activity.identifier,
        content: { markdown: activity.content },
      };

    case ConversationActivityTypeEnum.DELETE:
      return {
        type: 'channel.delete',
        messageId: activity.platformMessageId ?? activity.identifier,
      };

    default:
      return null;
  }
}

export interface EventMapContext {
  conversationId: string;
  conversationIdentifier: string;
  agentIdentifier: string;
}

function buildEnvelope(
  activity: ConversationActivityEntity,
  event: AgentEvent,
  sequence: number,
  context: EventMapContext
): AgentEventEnvelope {
  return {
    version: AGENT_EVENT_PROTOCOL_VERSION,
    conversationId: context.conversationId,
    conversationIdentifier: context.conversationIdentifier,
    agentId: context.agentIdentifier,
    runId: 'history',
    turnId: activity.identifier,
    sequence,
    timestamp: activity.createdAt,
    event,
  };
}

/**
 * Sequence allocation happens at write time. Activities without a stored
 * sequence are dev-only legacy rows and are not part of the event history.
 */
function toMappableActivity(
  activity: ConversationActivityEntity
): { activity: ConversationActivityEntity; event: AgentEvent; sequence: number } | null {
  if (typeof activity.sequence !== 'number') {
    return null;
  }

  const event = mapActivityToEvent(activity);
  if (!event || isDeltaEvent(event)) {
    return null;
  }

  return { activity, event, sequence: activity.sequence };
}

/**
 * Build a live WS envelope from a freshly persisted activity row.
 * Returns null when the activity type is not mappable or lacks a sequence.
 */
export function buildLiveEnvelopeFromActivity(
  activity: ConversationActivityEntity,
  context: EventMapContext
): AgentEventEnvelope | null {
  const mappable = toMappableActivity(activity);
  if (!mappable) {
    return null;
  }

  return buildEnvelope(mappable.activity, mappable.event, mappable.sequence, context);
}

/**
 * Map a newest-first, already-filtered activity page to chronological envelopes.
 * The repository owns type/sequence filtering; this only builds wire envelopes.
 */
export function mapNewestFirstEventActivities(
  activities: ConversationActivityEntity[],
  context: EventMapContext
): AgentEventEnvelope[] {
  const events: AgentEventEnvelope[] = [];

  for (let index = activities.length - 1; index >= 0; index -= 1) {
    const activity = activities[index];
    if (!activity) {
      continue;
    }

    const mappable = toMappableActivity(activity);
    if (!mappable) {
      continue;
    }

    events.push(buildEnvelope(mappable.activity, mappable.event, mappable.sequence, context));
  }

  return events;
}
