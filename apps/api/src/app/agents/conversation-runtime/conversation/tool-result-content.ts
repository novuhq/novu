import type { AgentToolResultContent } from '@novu/agent-event-protocol';
import type { ConversationActivityToolResultPart } from '@novu/dal';

export const TOOL_RESULT_CONTENT_MAX_BYTES = 65536;

export interface StoredToolResultContent {
  content: ConversationActivityToolResultPart[];
  truncated: boolean;
}

/**
 * Keeps parts in order while they fit in `maxBytes` (text counts its UTF-8 bytes, other parts their
 * JSON size). The first text part that does not fit is cut to the space left, and the parts after it
 * are dropped. Media parts never keep their `data`.
 */
export function capToolResultContent(
  parts: AgentToolResultContent[],
  maxBytes = TOOL_RESULT_CONTENT_MAX_BYTES
): StoredToolResultContent {
  const content: ConversationActivityToolResultPart[] = [];
  let remaining = maxBytes;
  let truncated = false;

  for (const part of parts) {
    if (part.type === 'media' && part.data) {
      truncated = true;
    }

    const stored = toStoredPart(part);
    const size = storedPartBytes(stored);

    if (size <= remaining) {
      content.push(stored);
      remaining -= size;
      continue;
    }

    truncated = true;

    if (stored.type === 'text') {
      const text = truncateUtf8(stored.text, remaining);

      if (text) {
        content.push({ type: 'text', text });
      }
    }

    break;
  }

  return { content, truncated };
}

function toStoredPart(part: AgentToolResultContent): ConversationActivityToolResultPart {
  if (part.type === 'media') {
    return { type: 'media', mediaType: part.mediaType, ...(part.name ? { name: part.name } : {}) };
  }

  return part;
}

function storedPartBytes(part: ConversationActivityToolResultPart): number {
  if (part.type === 'text') {
    return Buffer.byteLength(part.text, 'utf8');
  }

  return Buffer.byteLength(JSON.stringify(part), 'utf8');
}

/** `text` is longer than `maxBytes`, so the cut backs off to the start of a split multi-byte character. */
function truncateUtf8(text: string, maxBytes: number): string {
  const bytes = Buffer.from(text, 'utf8');
  let end = maxBytes;

  while (end > 0 && (bytes[end] & 0xc0) === 0x80) {
    end -= 1;
  }

  return bytes.subarray(0, end).toString('utf8');
}
