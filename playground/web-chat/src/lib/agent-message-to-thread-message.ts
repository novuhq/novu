import type { AgentMessage } from '@novu/react';
import type { ThreadMessageLike, ToolApprovalOption } from '@assistant-ui/react';
import { APPROVAL_OPTIONS } from './approval-options';

const POWERED_BY =
  /(?:\n+)?(?:Powered by\s*\[[^\]]+\]\([^)]+\)|Powered by\s*<https?:\/\/[^|>]+\|[^>]+>|\[Powered by Novu\]\([^)]+\)|Powered by\s*<a\b[^>]*>[\s\S]*?<\/a>|Powered by Novu\u200B?)\s*$/i;

function stripPoweredBy(text: string): string {
  return text.replace(POWERED_BY, '').trimEnd();
}

function isPoweredByWatermark(content: string): boolean {
  const trimmed = content.trim();

  return /^powered by/i.test(trimmed) && /novu/i.test(trimmed);
}

/** Novu-branded empty cards unwrap to plain markdown instead of rendering a card shell. */
function brandedReplyMarkdown(card: Record<string, unknown>): string | null {
  if (typeof card.title === 'string' && card.title.trim()) return null;
  if (typeof card.subtitle === 'string' && card.subtitle.trim()) return null;
  if (typeof card.imageUrl === 'string' && card.imageUrl.trim()) return null;

  const children = Array.isArray(card.children) ? card.children : [];
  const texts: string[] = [];
  let sawWatermark = false;

  for (const child of children) {
    if (!child || typeof child !== 'object' || !('type' in child) || child.type !== 'text') {
      return null;
    }

    const content = typeof child.content === 'string' ? child.content : '';
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
          data: { card: part.card, sourceMessageId: message.id },
        });
        break;
      }
      case 'mcp-connection': {
        content.push({ type: 'data', name: 'novu-mcp', data: part });
        break;
      }
      case 'source':
        // Protocol/read-path only — no public agent producer yet; omit from playground UI.
        break;
      case 'file': {
        content.push({ type: 'data', name: 'novu-file', data: part });
        break;
      }
      case 'data': {
        content.push({ type: 'data', name: part.name, data: part.data });
        break;
      }
      default:
        break;
    }
  }

  const hasPendingApproval = message.parts.some(
    (part): part is Extract<AgentMessage['parts'][number], { type: 'approval' }> =>
      part.type === 'approval' && part.state === 'pending'
  );

  if (message.role === 'user') {
    // Stable assistant-ui identity across optimistic opt_* → server msg_* reconciliation.
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
