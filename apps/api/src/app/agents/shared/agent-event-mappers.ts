import type {
  AgentApprovalRequest,
  AgentEvent,
  AgentEventUsage,
  AgentFileRef,
  AgentMessageContent,
  AgentSignal,
} from '@novu/agent-event-protocol';
import type { Signal, ToolResult } from '@novu/framework/internal';
import type { ActionRequired, Response as ThalamusResponse } from '@novu/thalamus';
import type { EditPayloadDto, ReplyContentDto } from './dtos/agent-reply-payload.dto';

/** Pure protocol-shape mappers between `AgentEvent` and the internal reply/Thalamus DTOs. No DI, no side effects. */

/**
 * `AgentMessageContent['card']` is `Record<string, unknown>` on the wire — the protocol can't
 * depend on the `chat` package's `CardElement` type — while `ReplyContentDto['card']` is the
 * validated Chat SDK shape. This is the one place that crosses that trust boundary; the DTO's
 * own `@Validate(IsValidReplyContent)` rejects anything that isn't actually card-shaped.
 */
export function toReplyContent(content: AgentMessageContent, files?: AgentFileRef[]): ReplyContentDto | null {
  const base: ReplyContentDto =
    'markdown' in content
      ? { markdown: content.markdown }
      : {
          card: content.card as unknown as ReplyContentDto['card'],
        };

  if ('markdown' in content && !content.markdown?.trim()) {
    return null;
  }

  if (files?.length) {
    return {
      ...base,
      files: files.map((file) => ({
        filename: file.name ?? file.fileId,
        mimeType: file.mediaType,
        data: file.data,
        url: file.url,
      })),
    };
  }

  return base;
}

/**
 * `channel.edit` variant of {@link toReplyContent}: same mapped shape, narrowed to
 * `EditPayloadDto['content']`'s exactly-one-of-three-classes union instead of `ReplyContentDto`'s
 * all-optional shape. Confines that second cast to this one mapper too.
 */
export function toEditContent(content: AgentMessageContent, files?: AgentFileRef[]): EditPayloadDto['content'] | null {
  const mapped = toReplyContent(content, files);

  return mapped ? (mapped as unknown as EditPayloadDto['content']) : null;
}

/**
 * The wire protocol's `AgentSignal.to` is `unknown` (the ingest DTO's `IsValidTriggerRecipient`
 * validator does the real runtime check), while `HandleAgentReplyCommand` takes the framework's
 * `Signal`, whose `to` is the narrower `TriggerRecipientsPayload`. Confines that widening cast
 * to this one mapper.
 */
export function toFrameworkSignal(signal: AgentSignal): Signal {
  return signal as unknown as Signal;
}

export function mapToolUseResultEvent(event: Extract<AgentEvent, { type: 'tool-use-result' }>): ToolResult {
  const textParts: string[] = [];
  let output: unknown;

  for (const part of event.content) {
    if (part.type === 'text') {
      textParts.push(part.text);
    } else if (part.type === 'json') {
      output = part.value;
    }
  }

  const joinedText = textParts.join('');

  return {
    toolCallId: event.toolUseId,
    output: output ?? joinedText,
    preview: joinedText || undefined,
  };
}

export function toThalamusUsage(usage?: AgentEventUsage): ThalamusResponse['usage'] {
  if (!usage) {
    return undefined;
  }

  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  };
}

export function toActionRequired(approval: AgentApprovalRequest): ActionRequired {
  if (approval.source?.type === 'mcp') {
    return {
      type: 'mcp-approval',
      toolUseId: approval.toolUseId,
      toolName: approval.toolName,
      serverName: approval.source.serverName,
      input: approval.input,
    };
  }

  return {
    type: 'tool-confirmation',
    toolUseId: approval.toolUseId,
    toolName: approval.toolName,
    input: approval.input,
  };
}
