import type { AgentToolResultContent } from '@novu/agent-event-protocol';
import type { ConversationActivityToolData, ConversationActivityToolResultPart } from '@novu/dal';
import type { RecordToolResultParams } from './agent-conversation.types';

const TOOL_RESULT_CONTENT_MAX_BYTES = 65536;
const TEXT_PART_OVERHEAD_BYTES = Buffer.byteLength(JSON.stringify({ type: 'text', text: '' }), 'utf8');

/**
 * Per-result cap for the model-facing `toolData.output`. Self-hosted bridges rebuild the whole
 * model transcript from `output` on every turn, so an unbounded MCP result (Notion search etc.)
 * blows the provider's context window (`prompt is too long`). Bytes ≈ chars for typical ASCII tool
 * output; kept well under the 64KB human-facing `content` cap so many tool rows can coexist.
 */
export const TOOL_OUTPUT_MAX_BYTES = 16_384;

export interface StoredToolResultContent {
  content: ConversationActivityToolResultPart[];
  truncated: boolean;
}

export interface CappedToolOutput {
  output: unknown;
  truncated: boolean;
}

export function toolResultData(params: RecordToolResultParams): ConversationActivityToolData {
  const stored = capToolResultContent(params.content);
  const cappedOutput = params.modelFacing ? capToolOutput(params.modelFacing.output) : undefined;
  const truncated = stored.truncated || (cappedOutput?.truncated ?? false);

  return {
    toolCallId: params.toolCallId,
    ...(params.toolName ? { toolName: params.toolName } : {}),
    ...(cappedOutput ? { output: cappedOutput.output } : { recordOnly: true }),
    content: stored.content,
    isError: params.isError === true,
    ...(truncated ? { truncated: true } : {}),
  };
}

/**
 * Bound a model-facing tool `output` to `maxBytes`. Strings are truncated in place; other
 * JSON-serializable values are serialized then truncated, so an over-budget value degrades to a
 * truncated string the model can still read. The marker is appended inside the budget so the
 * returned value never exceeds `maxBytes`. Unserializable values are left untouched.
 */
export function capToolOutput(output: unknown, maxBytes = TOOL_OUTPUT_MAX_BYTES): CappedToolOutput {
  if (output === undefined || output === null) {
    return { output, truncated: false };
  }

  const serialized = typeof output === 'string' ? output : safeSerialize(output);
  if (serialized === undefined) {
    return { output, truncated: false };
  }

  if (Buffer.byteLength(serialized, 'utf8') <= maxBytes) {
    return { output, truncated: false };
  }

  const marker = `… [truncated: tool output exceeded ${maxBytes} bytes]`;
  const kept = truncateUtf8(serialized, Math.max(0, maxBytes - Buffer.byteLength(marker, 'utf8')));

  return { output: `${kept}${marker}`, truncated: true };
}

function safeSerialize(value: unknown): string | undefined {
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
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
