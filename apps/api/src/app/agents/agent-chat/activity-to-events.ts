import {
  AGENT_EVENT_PROTOCOL_VERSION,
  type AgentEvent,
  type AgentEventEnvelope,
  type AgentFileRef,
  type AgentMessageContent,
  isDeltaEvent,
} from '@novu/agent-event-protocol';
import {
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
} from '@novu/dal';
import {
  mapRunLifecycleActivityToEvent,
  runIdFromLifecycleIdentifier,
} from '../conversation-runtime/conversation/run-lifecycle-activity';
import { DIRECT_TOOL_APPROVAL_ACTION_PREFIX, MCP_TOOL_APPROVAL_ACTION_PREFIX } from '../shared/tool-approval/action-id';
import { mintApprovalActionIds, mintManagedApprovalActionIds } from '../shared/tool-approval/mint-approval-action-ids';

type McpConnectionActivityData = {
  actionId?: string;
  mcpId?: string;
  displayName?: string;
  authorizeUrl?: string;
  authorizeUrlWithAutoApprove?: string;
  status?: 'connected' | 'failed';
  message?: string;
};

function filesFromRichContent(richContent?: Record<string, unknown>) {
  const files = richContent?.files;
  if (!Array.isArray(files) || files.length === 0) {
    return undefined;
  }

  return files as AgentFileRef[];
}

function isCardTree(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && (value as { type?: unknown }).type === 'card';
}

function isManagedToolApprovalRequest(toolData: ConversationActivityEntity['toolData']): boolean {
  const approveActionId = toolData?.approveActionId;
  if (!approveActionId) {
    return false;
  }

  return (
    approveActionId.startsWith(`${MCP_TOOL_APPROVAL_ACTION_PREFIX}:`) ||
    approveActionId.startsWith(`${DIRECT_TOOL_APPROVAL_ACTION_PREFIX}:`)
  );
}

function mintTrustActionIdsFromStoredToolData(toolData: NonNullable<ConversationActivityEntity['toolData']>) {
  if (!isManagedToolApprovalRequest(toolData) || !toolData.toolCallId || !toolData.toolName) {
    return {};
  }

  const managed = mintManagedApprovalActionIds({
    toolUseId: toolData.toolCallId,
    toolName: toolData.toolName,
    mcpServerName: toolData.mcpServerName,
  });

  return {
    trustToolActionId: managed.trustToolActionId,
    ...(managed.trustServerActionId ? { trustServerActionId: managed.trustServerActionId } : {}),
  };
}

/** Prefer the stored Card tree. Fall back to markdown when no Card is present. */
export function messageContentFromStored(params: {
  content?: string;
  richContent?: Record<string, unknown>;
}): AgentMessageContent {
  const card = params.richContent?.card;
  if (isCardTree(card)) {
    return { card };
  }

  return { markdown: params.content ?? '' };
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
        content: messageContentFromStored({ content: activity.content, richContent: activity.richContent }),
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
          ? {
              approveActionId: toolData.approveActionId,
              denyActionId: toolData.denyActionId,
            }
          : mintApprovalActionIds({ approvalId: toolData.approvalId });

      return {
        type: 'tool-approval-request',
        messageId: activity.identifier,
        approvalId: toolData.approvalId,
        toolUseId: toolData.toolCallId,
        toolName: toolData.toolName,
        input: toolData.input,
        approveActionId: actionIds.approveActionId,
        denyActionId: actionIds.denyActionId,
        ...mintTrustActionIdsFromStoredToolData(toolData),
        source: toolData.mcpServerName ? { type: 'mcp', serverName: toolData.mcpServerName } : undefined,
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

    case ConversationActivityTypeEnum.MCP_CONNECTION_REQUEST: {
      const data = activity.richContent?.mcpConnection as McpConnectionActivityData | undefined;
      if (!data?.actionId || !data.mcpId || !data.displayName || !data.authorizeUrl) {
        return null;
      }

      return {
        type: 'mcp-connection-request',
        actionId: data.actionId,
        mcpId: data.mcpId,
        displayName: data.displayName,
        authorizeUrl: data.authorizeUrl,
        authorizeUrlWithAutoApprove: data.authorizeUrlWithAutoApprove,
      };
    }

    case ConversationActivityTypeEnum.MCP_CONNECTION_RESULT: {
      const data = activity.richContent?.mcpConnection as McpConnectionActivityData | undefined;
      if (!data?.actionId || !data.mcpId || !data.status) {
        return null;
      }

      return {
        type: 'mcp-connection-result',
        actionId: data.actionId,
        mcpId: data.mcpId,
        status: data.status,
        message: data.message,
      };
    }

    case ConversationActivityTypeEnum.EDIT:
      return {
        type: 'channel.edit',
        messageId: activity.platformMessageId ?? activity.identifier,
        content: messageContentFromStored({ content: activity.content, richContent: activity.richContent }),
      };

    case ConversationActivityTypeEnum.DELETE:
      return {
        type: 'channel.delete',
        messageId: activity.platformMessageId ?? activity.identifier,
      };

    case ConversationActivityTypeEnum.RUN_START:
    case ConversationActivityTypeEnum.RUN_FINISH:
    case ConversationActivityTypeEnum.RUN_ERROR:
      return mapRunLifecycleActivityToEvent(activity);

    case ConversationActivityTypeEnum.SIGNAL:
      return null;

    case ConversationActivityTypeEnum.CUSTOM: {
      const custom = activity.richContent?.custom as { name?: unknown; data?: unknown } | undefined;
      if (typeof custom?.name !== 'string' || custom.name.length === 0) {
        return null;
      }

      return {
        type: 'custom',
        name: custom.name,
        data: custom.data,
      };
    }

    default: {
      const _exhaustive: never = activity.type;
      void _exhaustive;

      return null;
    }
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
  const lifecycleRunId = runIdFromLifecycleIdentifier(activity.identifier);

  return {
    version: AGENT_EVENT_PROTOCOL_VERSION,
    conversationId: context.conversationId,
    conversationIdentifier: context.conversationIdentifier,
    agentId: context.agentIdentifier,
    runId: lifecycleRunId ?? 'history',
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
