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

function mapActivityToEvent(activity: ConversationActivityEntity): AgentEvent | null {
  switch (activity.type) {
    case ConversationActivityTypeEnum.MESSAGE:
      if (activity.senderType === ConversationActivitySenderTypeEnum.AGENT) {
        return {
          type: 'message',
          // Browser-visible id is platformMessageId (aligned with live WS envelopes).
          messageId: activity.platformMessageId ?? activity.identifier,
          content: { markdown: activity.content },
          files: filesFromRichContent(activity.richContent),
        };
      }

      if (activity.senderType === ConversationActivitySenderTypeEnum.SUBSCRIBER) {
        return {
          type: 'custom',
          name: 'subscriber.message',
          data: {
            messageId: activity.identifier,
            content: { markdown: activity.content },
          },
        };
      }

      return null;

    case ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST: {
      const toolData = activity.toolData;
      if (!toolData?.approvalId || !toolData.toolCallId || !toolData.toolName) {
        return null;
      }

      return {
        type: 'tool-approval-request',
        approvalId: toolData.approvalId,
        toolUseId: toolData.toolCallId,
        toolName: toolData.toolName,
        input: toolData.input,
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

function buildEnvelope(
  activity: ConversationActivityEntity,
  event: AgentEvent,
  sequence: number,
  context: { conversationId: string; agentIdentifier: string }
): AgentEventEnvelope {
  return {
    version: AGENT_EVENT_PROTOCOL_VERSION,
    conversationId: context.conversationId,
    agentId: context.agentIdentifier,
    runId: 'history',
    turnId: activity.identifier,
    sequence,
    timestamp: activity.createdAt,
    event,
  };
}

function resolveSequence(activity: ConversationActivityEntity, computed: number): number {
  return typeof activity.sequence === 'number' ? activity.sequence : computed;
}

export function isMappableActivity(activity: ConversationActivityEntity): boolean {
  const event = mapActivityToEvent(activity);

  return event !== null && !isDeltaEvent(event);
}

export function activityToEvents(
  activities: ConversationActivityEntity[],
  context: { conversationId: string; agentIdentifier: string },
  sequenceOffset = 0
): AgentEventEnvelope[] {
  const envelopes: AgentEventEnvelope[] = [];
  let computed = sequenceOffset;

  for (const activity of activities) {
    const event = mapActivityToEvent(activity);
    if (!event || isDeltaEvent(event)) {
      continue;
    }

    computed += 1;
    const sequence = resolveSequence(activity, computed);
    if (typeof activity.sequence === 'number') {
      computed = Math.max(computed, activity.sequence);
    }
    envelopes.push(buildEnvelope(activity, event, sequence, context));
  }

  return envelopes;
}

export function mapActivitiesToEventPage(
  activities: ConversationActivityEntity[],
  context: { conversationId: string; agentIdentifier: string },
  options: {
    sequenceOffset?: number;
    afterSequence?: number;
    limit: number;
  }
): {
  events: AgentEventEnvelope[];
  lastActivityId?: string;
  hasMoreActivities: boolean;
  nextSequence: number;
} {
  const events: AgentEventEnvelope[] = [];
  let computed = options.sequenceOffset ?? 0;
  let lastActivityId: string | undefined;
  let lastSequence = computed;

  for (const activity of activities) {
    const event = mapActivityToEvent(activity);
    if (!event || isDeltaEvent(event)) {
      continue;
    }

    computed += 1;
    const sequence = resolveSequence(activity, computed);
    if (typeof activity.sequence === 'number') {
      computed = Math.max(computed, activity.sequence);
    }
    lastSequence = sequence;

    if (options.afterSequence !== undefined && sequence <= options.afterSequence) {
      lastActivityId = activity._id;
      continue;
    }

    if (events.length >= options.limit) {
      return {
        events,
        lastActivityId,
        hasMoreActivities: true,
        nextSequence: lastSequence,
      };
    }

    events.push(buildEnvelope(activity, event, sequence, context));
    lastActivityId = activity._id;
  }

  return {
    events,
    lastActivityId,
    hasMoreActivities: false,
    nextSequence: lastSequence,
  };
}
