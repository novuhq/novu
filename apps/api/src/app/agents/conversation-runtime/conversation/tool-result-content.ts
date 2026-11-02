import type { AgentToolResultContent } from '@novu/agent-event-protocol';
import type { ConversationActivityToolData, ConversationActivityToolResultPart } from '@novu/dal';
import type { RecordToolResultParams } from './agent-conversation.types';

const TOOL_RESULT_CONTENT_MAX_BYTES = 65536;
const TEXT_PART_OVERHEAD_BYTES = Buffer.byteLength(JSON.stringify({ type: 'text', text: '' }), 'utf8');

export interface StoredToolResultContent {
  content: ConversationActivityToolResultPart[];
  truncated: boolean;
}

export function toolResultData(params: RecordToolResultParams): ConversationActivityToolData {
  const stored = capToolResultContent(params.content);

  return {
    toolCallId: params.toolCallId,
    ...(params.toolName ? { toolName: params.toolName } : {}),
    ...(params.modelFacing ? { output: params.modelFacing.output } : { recordOnly: true }),
    content: stored.content,
    isError: params.isError === true,
    ...(stored.truncated ? { truncated: true } : {}),
  };
}

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
    if (!stored) {
      truncated = true;
      continue;
    }

    const size = storedPartBytes(stored);

    if (size <= remaining) {
      content.push(stored);
      remaining -= size;
      continue;
    }

    truncated = true;

    if (stored.type === 'text') {
      const text = truncateUtf8(stored.text, remaining - TEXT_PART_OVERHEAD_BYTES);

      if (text) {
        content.push({ type: 'text', text });
      }
    }

    break;
  }

  return { content, truncated };
}

/** Bridge parts reach here unvalidated, so each one is rebuilt from its known fields. */
function toStoredPart(part: AgentToolResultContent): ConversationActivityToolResultPart | undefined {
  switch (part.type) {
    case 'text':
      return typeof part.text === 'string' ? { type: 'text', text: part.text } : undefined;
    case 'citation':
      return {
        type: 'citation',
        url: part.url,
        ...(part.title ? { title: part.title } : {}),
        ...(part.excerpts ? { excerpts: part.excerpts } : {}),
      };
    case 'json':
      return { type: 'json', value: part.value };
    case 'media':
      return { type: 'media', mediaType: part.mediaType, ...(part.name ? { name: part.name } : {}) };
    case 'unknown':
      return { type: 'unknown', providerType: part.providerType, data: part.data };
    default:
      return undefined;
  }
}

function storedPartBytes(part: ConversationActivityToolResultPart): number {
  if (part.type === 'text') {
    return TEXT_PART_OVERHEAD_BYTES + Buffer.byteLength(part.text, 'utf8');
  }

  return Buffer.byteLength(JSON.stringify(part), 'utf8');
}

function truncateUtf8(text: string, maxBytes: number): string {
  const bytes = Buffer.from(text, 'utf8');
  let end = Math.max(0, maxBytes);

  while (end > 0 && isUtf8ContinuationByte(bytes[end])) {
    end -= 1;
  }

  return bytes.subarray(0, end).toString('utf8');
}

function isUtf8ContinuationByte(byte: number | undefined): boolean {
  return byte !== undefined && (byte & 0xc0) === 0x80;
}
