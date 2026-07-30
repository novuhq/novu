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

export function parsePostableMessage(message: AdapterPostableMessage): {
  content: string;
  richContent?: Record<string, unknown>;
} {
  if (typeof message === 'string') {
    return { content: message };
  }

  if (message && typeof message === 'object') {
    const record = message as { markdown?: string; card?: CardElement; files?: unknown[]; raw?: string };
    const richContent: Record<string, unknown> = {};
    if (record.card) {
      richContent.card = record.card;
    }
    if (record.files?.length) {
      richContent.files = record.files;
    }

    if (typeof record.markdown === 'string') {
      return { content: record.markdown, richContent: Object.keys(richContent).length ? richContent : undefined };
    }

    if (typeof record.raw === 'string') {
      return { content: record.raw, richContent: Object.keys(richContent).length ? richContent : undefined };
    }

    if (record.card) {
      return { content: record.card.title ?? '[Card]', richContent };
    }
  }

  return { content: '' };
}
