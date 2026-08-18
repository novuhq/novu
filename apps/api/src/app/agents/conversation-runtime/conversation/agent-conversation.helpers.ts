export const INBOUND_ATTACHMENT_ONLY_PREVIEW = '[Attachment]';
export const DEFAULT_CONVERSATION_TITLE = 'Untitled conversation';

/** Default number of recent activities loaded as conversation history for every runtime. */
export const AGENT_HISTORY_LIMIT = 50;

export function getConversationTitle(firstMessageText: string): string {
  const trimmed = firstMessageText.trim();

  if (trimmed.length === 0) {
    return DEFAULT_CONVERSATION_TITLE;
  }

  return trimmed.slice(0, 200);
}

export function getInboundActivityPreview(
  content: string | undefined,
  options: { richContent?: Record<string, unknown>; hasPlatformAttachments?: boolean } = {}
): string {
  const trimmed = content?.trim() ?? '';

  if (trimmed.length > 0) {
    return trimmed;
  }

  const attachments = options.richContent?.attachments;
  const hasStoredAttachments = Array.isArray(attachments) && attachments.length > 0;

  if (hasStoredAttachments || options.hasPlatformAttachments) {
    return INBOUND_ATTACHMENT_ONLY_PREVIEW;
  }

  return trimmed;
}
