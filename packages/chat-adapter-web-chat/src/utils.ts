import type { AdapterPostableMessage, CardElement } from 'chat';
import { customAlphabet } from 'nanoid';
import type { WebChatRawMessage } from './types.js';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(ALPHABET);

export const ADAPTER_NAME = 'web_chat';
export const CONVERSATION_ID_PATTERN = /^conv_[0-9a-z]{12}$/;
export const MESSAGE_ID_PATTERN = /^msg_[0-9a-z]{12}$/;
export const ACTION_IDEMPOTENCY_PATTERN = /^idem_[0-9a-z]{12}$/;
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

export function isValidActionIdempotencyKey(value: string): boolean {
  return ACTION_IDEMPOTENCY_PATTERN.test(value);
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

type PostableRecord = {
  type?: string;
  title?: string;
  children?: CardElement['children'];
  markdown?: string;
  card?: CardElement;
  files?: unknown[];
  raw?: string;
  messageId?: string;
};

function collectRichContent(record: PostableRecord): Record<string, unknown> {
  const richContent: Record<string, unknown> = {};
  if (record.card) {
    richContent.card = record.card;
  }
  if (record.files?.length) {
    richContent.files = record.files;
  }

  return richContent;
}

function parsePostableRecord(message: object): ReturnType<typeof parsePostableMessage> | undefined {
  const record = message as PostableRecord;
  const messageId = typeof record.messageId === 'string' ? record.messageId : undefined;

  // chat-sdk `thread.post(card)` passes a bare CardElement for gate replies.
  if (record.type === 'card') {
    const card = message as CardElement;

    return { content: extractCardPlainText(card), richContent: { card }, messageId };
  }

  const richContent = collectRichContent(record);
  const text = typeof record.markdown === 'string' ? record.markdown : record.raw;

  if (typeof text === 'string') {
    return { content: text, richContent: Object.keys(richContent).length ? richContent : undefined, messageId };
  }

  if (record.card) {
    return { content: extractCardPlainText(record.card), richContent, messageId };
  }

  return undefined;
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
    const parsed = parsePostableRecord(message);
    if (parsed) {
      return parsed;
    }
  }

  return { content: '' };
}

const MAX_METADATA_KEYS = 20;
const MAX_METADATA_KEY_LENGTH = 64;
const MAX_METADATA_STRING_LENGTH = 512;

/**
 * Reduces client-supplied per-message metadata to a flat map of scalars.
 * Returns undefined when the input is not a plain object or nothing survives.
 */
export function sanitizeMessageMetadata(input: unknown): WebChatRawMessage['metadata'] {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return undefined;
  }

  const result: NonNullable<WebChatRawMessage['metadata']> = {};
  let count = 0;

  for (const [key, value] of Object.entries(input)) {
    if (count >= MAX_METADATA_KEYS) {
      break;
    }

    // JSON.parse yields an own `__proto__` key; assigning it would swap the result's prototype.
    if (key === '__proto__' || key.length > MAX_METADATA_KEY_LENGTH) {
      continue;
    }

    const isScalar =
      value === null ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value)) ||
      (typeof value === 'string' && value.length <= MAX_METADATA_STRING_LENGTH);
    if (!isScalar) {
      continue;
    }

    result[key] = value as string | number | boolean | null;
    count += 1;
  }

  return count > 0 ? result : undefined;
}
