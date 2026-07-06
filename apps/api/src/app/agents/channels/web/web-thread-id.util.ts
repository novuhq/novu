/**
 * Thread-id helpers for the web platform, mirrored from `@novu/chat-adapter-web`
 * (`src/thread-id.ts`). Duplicated because that package is ESM-only and these
 * are needed synchronously in CJS Nest code; the format is part of the wire
 * contract and must stay in sync with the adapter.
 */

export const WEB_THREAD_PREFIX = 'web';

/** Client-generated conversation ids: colon-free so they embed in thread ids. */
export const WEB_CONVERSATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function encodeWebThreadId(data: { subscriberId: string; conversationId: string }): string {
  return `${WEB_THREAD_PREFIX}:${encodeURIComponent(data.subscriberId)}:${data.conversationId}`;
}

export function decodeWebThreadId(threadId: string): { subscriberId: string; conversationId: string } | null {
  const parts = threadId.split(':');
  if (parts.length !== 3 || parts[0] !== WEB_THREAD_PREFIX || !parts[1] || !parts[2]) {
    return null;
  }

  return { subscriberId: decodeURIComponent(parts[1]), conversationId: parts[2] };
}
