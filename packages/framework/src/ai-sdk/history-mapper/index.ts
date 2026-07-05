import type { ModelMessage } from 'ai';
import type { AgentHistoryEntry } from '../../resources/agent/agent.types';
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
 * Convert `ctx.history` into AI SDK `ModelMessage[]` for `streamText` / `generateText`.
 *
 * History already includes the current incoming message — do not append the handler's
 * `message` argument on top of it.
 */
export function toModelMessages(history: AgentHistoryEntry[], system?: string): ModelMessage[] {
  const multiSender = distinctHumanSenders(history) > 1;
  const index = buildApprovalIndex(history);
  const fromHistory = history.flatMap((entry) => mapHistoryEntry(entry, multiSender, index));

  if (!system) {
    return fromHistory;
  }

  return [{ role: 'system' as const, content: system }, ...fromHistory];
}
