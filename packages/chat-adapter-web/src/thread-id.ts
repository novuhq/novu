import type { NovuWebThreadId } from './types.js';

export const WEB_THREAD_PREFIX = 'web';

/**
 * Client-generated conversation ids are constrained to a colon-free alphabet so
 * they embed safely in the `web:<subscriber>:<conversation>` thread id format.
 */
export const WEB_CONVERSATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * `encodeURIComponent` escapes `:` so arbitrary subscriber ids survive the Chat
 * SDK's colon-delimited thread id format (same trick as the email adapter).
 */
export function encodeWebThreadId(data: NovuWebThreadId): string {
  if (!WEB_CONVERSATION_ID_PATTERN.test(data.conversationId)) {
    throw new Error(`Invalid web conversation id: ${data.conversationId}`);
  }

  return `${WEB_THREAD_PREFIX}:${encodeURIComponent(data.subscriberId)}:${data.conversationId}`;
}

export function decodeWebThreadId(threadId: string): NovuWebThreadId {
  const parts = threadId.split(':');
  if (parts.length !== 3 || parts[0] !== WEB_THREAD_PREFIX || !parts[1] || !parts[2]) {
    throw new Error(`Invalid web thread id: ${threadId}`);
  }

  return { subscriberId: decodeURIComponent(parts[1]), conversationId: parts[2] };
}

export function webChannelIdFromThreadId(threadId: string): string {
  const parts = threadId.split(':');
  if (parts.length !== 3 || parts[0] !== WEB_THREAD_PREFIX || !parts[1]) {
    throw new Error(`Invalid web thread id: ${threadId}`);
  }

  return `${WEB_THREAD_PREFIX}:${parts[1]}`;
}

/** Relay channel carrying WebOutboundEvents for one conversation thread. */
export function buildWebStreamChannel(channelPrefix: string, platformThreadId: string): string {
  return `${channelPrefix}:${platformThreadId}`;
}
