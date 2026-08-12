import type { AdapterPostableMessage, CardElement } from 'chat';
import { customAlphabet } from 'nanoid';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(ALPHABET);

export const ADAPTER_NAME = 'web_chat';
export const CONVERSATION_ID_PATTERN = /^conv_[0-9a-z]{12}$/;
export const MESSAGE_ID_PATTERN = /^msg_[0-9a-z]{12}$/;
export const THREAD_ID_PREFIX = `${ADAPTER_NAME}:`;

export function shortId(length = 12): string {
  return nanoid(length);
}

export function mintConversationId(): string {
  return `conv_${shortId(12)}`;
}

export function mintMessageId(): string {
  return `msg_${shortId(12)}`;
}

export function mintActivityId(): string {
  return `act_${shortId(12)}`;
}

export function isValidConversationId(value: string): boolean {
  return CONVERSATION_ID_PATTERN.test(value);
}

export function isValidMessageId(value: string): boolean {
  return MESSAGE_ID_PATTERN.test(value);
}

export function toThreadId(conversationId: string): string {
  return `${THREAD_ID_PREFIX}${conversationId}`;
}

export function conversationIdFromThreadId(threadId: string): string {
  if (threadId.startsWith(THREAD_ID_PREFIX)) {
    return threadId.slice(THREAD_ID_PREFIX.length);
  }

  return threadId;
}

/** Approval action ids may omit sourceMessageId (headless / no card carrier). */
export function isApprovalActionId(actionId: string): boolean {
  return (
    actionId.startsWith('tool-approval:') ||
    actionId.startsWith('mcp-approval:') ||
    actionId.startsWith('direct-approval:')
  );
}

/** Flatten card title + text/link children for live/history markdown parity. */
export function extractCardPlainText(card: CardElement): string {
  const title = typeof card.title === 'string' ? card.title.trim() : '';
  const childText = Array.isArray(card.children)
    ? card.children
        .flatMap((child) => {
          if (!child || typeof child !== 'object') {
            return [];
          }
          const node = child as { type?: string; content?: unknown; label?: unknown; url?: unknown };
          if (node.type === 'text' && typeof node.content === 'string' && node.content.trim()) {
            return [node.content.trim()];
          }
          if (node.type === 'link' && typeof node.label === 'string' && node.label.trim()) {
            const label = node.label.trim();
            const url = typeof node.url === 'string' ? node.url.trim() : '';

            return [url ? `${label} (${url})` : label];
          }

          return [];
        })
        .join('\n')
    : '';

  return childText || title || '[Card]';
}

export function parsePostableMessage(message: AdapterPostableMessage): {
  content: string;
  richContent?: Record<string, unknown>;
  /** Caller-supplied idempotent id (`supportsClientMessageIds`), stripped from content. */
  messageId?: string;
} {
  if (typeof message === 'string') {
    return { content: message };
  }

  if (message && typeof message === 'object') {
    const record = message as {
      type?: string;
      title?: string;
      children?: CardElement['children'];
      markdown?: string;
      card?: CardElement;
      files?: unknown[];
      raw?: string;
      messageId?: string;
    };
    const messageId = typeof record.messageId === 'string' ? record.messageId : undefined;

    // chat-sdk `thread.post(card)` passes a bare CardElement for gate replies.
    if (record.type === 'card') {
      const card = message as CardElement;

      return { content: extractCardPlainText(card), richContent: { card }, messageId };
    }

    const richContent: Record<string, unknown> = {};
    if (record.card) {
      richContent.card = record.card;
    }
    if (record.files?.length) {
      richContent.files = record.files;
    }

    if (typeof record.markdown === 'string') {
      return {
        content: record.markdown,
        richContent: Object.keys(richContent).length ? richContent : undefined,
        messageId,
      };
    }

    if (typeof record.raw === 'string') {
      return {
        content: record.raw,
        richContent: Object.keys(richContent).length ? richContent : undefined,
        messageId,
      };
    }

    if (record.card) {
      return { content: extractCardPlainText(record.card), richContent, messageId };
    }
  }

  return { content: '' };
}
