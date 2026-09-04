import type { ThreadMessageLike, ToolApprovalOption } from '@assistant-ui/react';
import type { AgentCardElement, AgentMessage } from '@novu/react';
import { APPROVAL_OPTIONS } from './approval-options';

/** Reserved assistant-ui data surfaces — only typed protocol parts may use these names. */
const RESERVED_NOVU_DATA_UI_NAMES = new Set(['novu-mcp', 'novu-card', 'novu-file']);

function customDataUiName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed || RESERVED_NOVU_DATA_UI_NAMES.has(trimmed)) {
    return null;
  }

  return trimmed;
}

const POWERED_BY =
  /(?:\n+)?(?:_*Powered by\s*\[[^\]]+\]\([^)]+\)_*|_*\[Powered by Novu\]\([^)]+\)_*|Powered by\s*<https?:\/\/[^|>]+\|[^>]+>|Powered by\s*<a\b[^>]*>[\s\S]*?<\/a>|Powered by Novu\u200B?)\s*$/i;

function stripPoweredBy(text: string): string {
  return text.replace(POWERED_BY, '').trimEnd();
}

function isPoweredByWatermark(content: string): boolean {
  const trimmed = content
    .trim()
    .replace(/^_+|_+$/g, '')
    .trim();

  return /^powered by/i.test(trimmed) && /novu/i.test(trimmed);
}

function brandedReplyMarkdown(card: AgentCardElement): string | null {
  if (card.title?.trim()) return null;
  if (card.subtitle?.trim()) return null;
  if (card.imageUrl?.trim()) return null;

  const texts: string[] = [];
  let sawWatermark = false;

  for (const child of card.children) {
    if (child.type !== 'text') {
      return null;
    }

    const content = child.content;
    if (!content) continue;

    if (isPoweredByWatermark(content)) {
      sawWatermark = true;
      continue;
    }

    texts.push(content);
  }

  if (!sawWatermark || texts.length === 0) {
    return null;
  }

  return texts.join('\n\n');
}

function approvalOptions(part: Extract<AgentMessage['parts'][number], { type: 'approval' }>): ToolApprovalOption[] {
  const options: ToolApprovalOption[] = [];

  if (part.denyActionId) {
    options.push(APPROVAL_OPTIONS.denied);
  }
  if (part.approveActionId) {
    options.push(APPROVAL_OPTIONS.approved);
  }
  if (part.trustToolActionId) {
    options.push(APPROVAL_OPTIONS['trust-tool']);
  }
  if (part.trustServerActionId && part.source?.type === 'mcp') {
    options.push({
      ...APPROVAL_OPTIONS['trust-server'],
      label: `Always allow ${part.source.serverName}`,
    });
  }

  return options;
}

function approvalGate(part: Extract<AgentMessage['parts'][number], { type: 'approval' }>) {
  const options = approvalOptions(part);

  if (part.state === 'pending') {
    return { id: part.approvalId, options };
  }

  return {
    id: part.approvalId,
    options,
    approved: part.state === 'approved',
    optionId: part.state === 'approved' ? APPROVAL_OPTIONS.approved.id : APPROVAL_OPTIONS.denied.id,
  };
}

type ThreadContent = Exclude<ThreadMessageLike['content'], string>;

export function agentMessageToThreadMessage(message: AgentMessage): ThreadMessageLike {
  const content: ThreadContent[number][] = [];
  const approvalByToolUseId = new Map(
    message.parts
      .filter((part): part is Extract<AgentMessage['parts'][number], { type: 'approval' }> => part.type === 'approval')
      .map((part) => [part.toolUseId, part])
  );

  const isStreaming = message.parts.some(
    (part) => (part.type === 'text' || part.type === 'thinking') && part.state === 'streaming'
  );
  const hasPendingApproval = message.parts.some((part) => part.type === 'approval' && part.state === 'pending');

  for (const part of message.parts) {
    switch (part.type) {
      case 'text': {
        const text = stripPoweredBy(part.text);
        if (!text.trim()) break;
        content.push({
          type: 'text',
          text,
          status: part.state === 'streaming' ? { type: 'running' } : { type: 'complete' },
        });
        break;
      }
      case 'thinking': {
        if (!part.text.trim() && part.state !== 'streaming') break;
        content.push({
          type: 'reasoning',
          text: part.text || '\u200b',
          status: part.state === 'streaming' ? { type: 'running' } : { type: 'complete' },
        });
        break;
      }
      case 'tool': {
        if (approvalByToolUseId.has(part.toolUseId)) break;
        content.push({
          type: 'tool-call',
          toolCallId: part.toolUseId,
          toolName: part.toolName,
          argsText: JSON.stringify(part.input ?? {}),
          result: part.output,
          isError: part.state === 'output-error',
        });
        break;
      }
      case 'approval': {
        content.push({
          type: 'tool-call',
          toolCallId: part.toolUseId,
          toolName: part.toolName,
          argsText: JSON.stringify(part.input ?? {}),
          approval: approvalGate(part),
        });
        break;
      }
      case 'card': {
        const unwrapped = brandedReplyMarkdown(part.card);
        if (unwrapped) {
          const text = stripPoweredBy(unwrapped);
          if (text.trim()) {
            content.push({ type: 'text', text, status: { type: 'complete' } });
          }
          break;
        }
        content.push({
          type: 'data',
          name: 'novu-card',
          data: part,
        });
        break;
      }
      case 'mcp-connection': {
        content.push({ type: 'data', name: 'novu-mcp', data: part });
        break;
      }
      case 'source':
        break;
      case 'file': {
        content.push({ type: 'data', name: 'novu-file', data: part });
        break;
      }
      case 'data': {
        const uiName = customDataUiName(part.name);
        if (!uiName) break;
        content.push({ type: 'data', name: uiName, data: part.data });
        break;
      }
      default:
        break;
    }
  }

  if (message.role === 'user') {
    const threadMessageId = message.idempotencyKey ?? message.id;

    return {
      id: threadMessageId,
      role: 'user',
      createdAt: new Date(message.createdAt),
      content: content.length > 0 ? content : [{ type: 'text', text: '' }],
      metadata: {
        custom: { novuStatus: message.status, novuMessageId: message.id },
      },
    };
  }

  let status: ThreadMessageLike['status'];
  if (isStreaming || message.status === 'sending') {
    status = { type: 'running' };
  } else if (hasPendingApproval) {
    status = { type: 'requires-action', reason: 'tool-calls' };
  } else {
    status = { type: 'complete', reason: 'stop' };
  }

  return {
    id: message.id,
    role: 'assistant',
    createdAt: new Date(message.createdAt),
    content,
    status,
    metadata: { custom: { novuStatus: message.status } },
  };
}

export function textFromAppendContent(content: readonly { type: string; text?: string }[]): string {
  return content
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text ?? '')
    .join('');
}
