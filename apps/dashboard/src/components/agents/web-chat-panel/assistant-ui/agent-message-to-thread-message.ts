import type { ThreadMessageLike, ToolApprovalOption } from '@assistant-ui/react';
import type { AgentMessage } from '@novu/react';
import { APPROVAL_OPTIONS } from './approval-options';

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
        if (!part.text.trim()) break;
        content.push({
          type: 'text',
          text: part.text,
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
        content.push({ type: 'data', name: 'novu-card', data: part });
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
        content.push({ type: 'data', name: part.name, data: part.data });
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
