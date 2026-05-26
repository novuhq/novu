import {
  type ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
} from '@novu/dal';
import { type Message, MessageRole } from '@novu/thalamus';

export const SESSION_RECOVERY_CONTEXT_HEADER =
  'The following is recovered conversation context from before this session. Messages labeled "Assistant" were sent by you; "User" messages were sent by the subscriber.\n\n';

export type BuildSessionBootstrapMessagesParams = {
  activities: ConversationActivityEntity[];
  currentPlatformMessageId?: string;
  currentText: string;
};

function formatContextLine(activity: ConversationActivityEntity): string | null {
  const trimmed = activity.content?.trim() ?? '';

  if (trimmed.length === 0) {
    return null;
  }

  if (activity.senderType === ConversationActivitySenderTypeEnum.AGENT) {
    return `Assistant: ${trimmed}`;
  }

  if (
    activity.senderType === ConversationActivitySenderTypeEnum.SUBSCRIBER ||
    activity.senderType === ConversationActivitySenderTypeEnum.PLATFORM_USER
  ) {
    return `User: ${trimmed}`;
  }

  return null;
}

function isCurrentInboundActivity(
  activity: ConversationActivityEntity,
  currentPlatformMessageId: string | undefined
): boolean {
  if (!currentPlatformMessageId) {
    return false;
  }

  return activity.platformMessageId === currentPlatformMessageId;
}

/**
 * Builds Thalamus messages when opening a new managed-agent session.
 * Prior turns are packed into a labeled user context message; the current inbound
 * line is sent as a separate user message (Anthropic sessions only accept user input).
 */
export function buildSessionBootstrapMessages(params: BuildSessionBootstrapMessagesParams): Message[] {
  const chronological = params.activities
    .filter((entry) => entry.type !== ConversationActivityTypeEnum.SIGNAL)
    .slice()
    .reverse();

  const priorActivities = chronological.filter(
    (entry) => !isCurrentInboundActivity(entry, params.currentPlatformMessageId)
  );
  const contextLines = priorActivities
    .map((entry) => formatContextLine(entry))
    .filter((line): line is string => line !== null);

  const currentText = params.currentText.trim();

  if (contextLines.length === 0) {
    if (currentText.length === 0) {
      return [];
    }

    return [{ role: MessageRole.USER, content: currentText }];
  }

  const contextMessage = SESSION_RECOVERY_CONTEXT_HEADER + contextLines.join('\n\n');

  if (currentText.length === 0) {
    return [{ role: MessageRole.USER, content: contextMessage }];
  }

  return [
    { role: MessageRole.USER, content: contextMessage },
    { role: MessageRole.USER, content: currentText },
  ];
}
