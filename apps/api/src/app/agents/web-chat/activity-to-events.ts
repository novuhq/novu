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
} from '@novu/dal';

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
          messageId: activity.identifier,
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

    default:
      return null;
  }
}

export function activityToEvents(
  activities: ConversationActivityEntity[],
  context: { conversationId: string; agentIdentifier: string }
): AgentEventEnvelope[] {
  const envelopes: AgentEventEnvelope[] = [];
  let sequence = 0;

  for (const activity of activities) {
    const event = mapActivityToEvent(activity);
    if (!event || isDeltaEvent(event)) {
      continue;
    }

    sequence += 1;
    envelopes.push({
      version: AGENT_EVENT_PROTOCOL_VERSION,
      conversationId: context.conversationId,
      agentId: context.agentIdentifier,
      runId: 'history',
      turnId: activity.identifier,
      sequence,
      timestamp: activity.createdAt,
      event,
    });
  }

  return envelopes;
}
