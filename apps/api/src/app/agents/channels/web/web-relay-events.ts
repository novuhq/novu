/**
 * Relay event schema published by `@novu/chat-adapter-web` (`WebOutboundEvent`).
 * Mirrored here because that package is ESM-only; the shape is part of the
 * relay wire contract and must stay in sync with the adapter.
 */

export interface WebFileRef {
  filename?: string;
  mimeType?: string;
  size?: number;
  url: string;
}

export interface WebMessageContent {
  markdown?: string;
  card?: Record<string, unknown>;
  files?: WebFileRef[];
}

export type WebOutboundEvent =
  | { kind: 'message'; messageId: string; content: WebMessageContent; ts: number }
  | { kind: 'edit'; messageId: string; content: WebMessageContent; ts: number }
  | { kind: 'delete'; messageId: string; ts: number }
  | { kind: 'typing'; status: string; ts: number }
  | { kind: 'reaction'; messageId: string; emoji: string; added: boolean; ts: number };

const KNOWN_KINDS = new Set(['message', 'edit', 'delete', 'typing', 'reaction']);

/** Defensive parse of a relay payload; unknown or malformed events return null. */
export function parseWebOutboundEvent(payload: string): WebOutboundEvent | null {
  try {
    const parsed = JSON.parse(payload) as { kind?: unknown };
    if (!parsed || typeof parsed !== 'object' || typeof parsed.kind !== 'string' || !KNOWN_KINDS.has(parsed.kind)) {
      return null;
    }

    return parsed as WebOutboundEvent;
  } catch {
    return null;
  }
}
