import type { ModelMessage } from 'ai';
import type { AgentHandlerContext, AgentHistoryEntry } from '../../resources/agent/agent.types';
import { type AgentTranscriptSource, resolveTranscriptSource } from '../../resources/agent/history-source';
import { buildWorkflowOriginInjection } from '../../resources/agent/workflow-origin-injection';
import {
  type ApprovalIndex,
  buildApprovalIndex,
  mapApprovalDecision,
  mapApprovalRequest,
  mapToolResult,
} from './approval-cycles';

/**
 * Maps Novu conversation ledger entries to AI SDK `ModelMessage[]`.
 *
 * Plain messages (user/agent text, role normalization) are handled here.
 * Tool approval cycles are delegated to `./approval-cycles`.
 */

const TYPE_MESSAGE = 'message';
const TYPE_TOOL_APPROVAL_REQUEST = 'tool_approval_request';
const TYPE_TOOL_APPROVAL_DECISION = 'tool_approval_decision';
const TYPE_TOOL_RESULT = 'tool_result';

function isAssistantRole(role: string): boolean {
  return role === 'agent' || role === 'assistant';
}

function distinctHumanSenders(history: AgentHistoryEntry[]): number {
  const names = new Set<string>();
  for (const entry of history) {
    if (!isAssistantRole(entry.role) && entry.role !== 'system' && entry.senderName) {
      names.add(entry.senderName);
    }
  }

  return names.size;
}

function mapTextMessage(entry: AgentHistoryEntry, multiSender: boolean): ModelMessage | undefined {
  if (!entry.content.trim()) {
    return undefined;
  }

  const isAssistant = isAssistantRole(entry.role);
  const text =
    !isAssistant && multiSender && entry.senderName ? `${entry.senderName}: ${entry.content}` : entry.content;

  return { role: isAssistant ? 'assistant' : 'user', content: text };
}

function mapHistoryEntry(entry: AgentHistoryEntry, multiSender: boolean, index: ApprovalIndex): ModelMessage[] {
  switch (entry.type) {
    case TYPE_MESSAGE: {
      const message = mapTextMessage(entry, multiSender);

      return message ? [message] : [];
    }
    case TYPE_TOOL_APPROVAL_REQUEST:
      return mapApprovalRequest(entry, index);
    case TYPE_TOOL_APPROVAL_DECISION: {
      const decisionMessage = mapApprovalDecision(entry, index);

      return decisionMessage ? [decisionMessage] : [];
    }
    case TYPE_TOOL_RESULT: {
      const resultMessage = mapToolResult(entry, index);

      return resultMessage ? [resultMessage] : [];
    }
    default:
      // `edit`, `signal`, and unknown types are UI/runtime artifacts — not model transcript.
      return [];
  }
}

/**
 * Convert conversation context into AI SDK `ModelMessage[]` for `streamText` / `generateText`.
 *
 * Pass `ctx` to prepend `ctx.notification` as an assistant row. Pass `ctx.history` to skip that
 * injection (e.g. after `isFromWorkflow`). History already includes the current inbound message.
 *
 * Pass the system prompt via `instructions` on `streamText` / `generateText`. AI SDK 7 rejects
 * `system` messages inside `messages` by default, so this helper never injects one.
 */
export function toModelMessages(history: AgentHistoryEntry[]): ModelMessage[];
export function toModelMessages(ctx: Pick<AgentHandlerContext, 'history' | 'notification'>): ModelMessage[];
export function toModelMessages(source: AgentTranscriptSource): ModelMessage[] {
  const { history, notification } = resolveTranscriptSource(source);
  const multiSender = distinctHumanSenders(history) > 1;
  const index = buildApprovalIndex(history);
  const mapped = history.flatMap((entry) => mapHistoryEntry(entry, multiSender, index));

  if (!notification) {
    return mapped;
  }

  return [
    {
      role: 'assistant',
      content: buildWorkflowOriginInjection(notification.workflowId, '', notification.payload),
    },
    ...mapped,
  ];
}
