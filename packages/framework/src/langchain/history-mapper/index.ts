import { AIMessage, type BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { AgentHistoryEntry } from '../../resources/agent/agent.types';
import { type ApprovalIndex, buildApprovalIndex, mapApprovalRequest, type ToolResultPayload } from './approval-cycles';

/**
 * Maps Novu conversation ledger entries to LangChain `BaseMessage[]`.
 *
 * Plain messages (user/agent text, role normalization) are handled here.
 * Tool approval cycles are delegated to `./approval-cycles`.
 */

const TYPE_MESSAGE = 'message';
const TYPE_TOOL_APPROVAL_REQUEST = 'tool_approval_request';

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

function mapTextMessage(entry: AgentHistoryEntry, multiSender: boolean): BaseMessage | undefined {
  if (!entry.content.trim()) {
    return undefined;
  }

  const isAssistant = isAssistantRole(entry.role);
  if (isAssistant) {
    return new AIMessage(entry.content);
  }

  const text = multiSender && entry.senderName ? `${entry.senderName}: ${entry.content}` : entry.content;

  return new HumanMessage(text);
}

function mapHistoryEntry(entry: AgentHistoryEntry, multiSender: boolean, index: ApprovalIndex): BaseMessage[] {
  switch (entry.type) {
    case TYPE_MESSAGE: {
      const message = mapTextMessage(entry, multiSender);

      return message ? [message] : [];
    }
    case TYPE_TOOL_APPROVAL_REQUEST:
      return mapApprovalRequest(entry, index);
    default:
      // `tool_approval_decision`, `tool_result`, `edit`, `signal`, and unknown types are
      // UI/runtime artifacts or already replayed at the request entry — not model transcript.
      return [];
  }
}

/**
 * Convert `ctx.history` into LangChain `BaseMessage[]` for `createAgent().invoke(...)`.
 *
 * History already includes the current incoming message — do not append the handler's
 * `message` argument on top of it.
 *
 * @param system - Optional system prompt prepended as a `SystemMessage`. Omit it when the
 *   agent already receives a prompt (e.g. via `createAgent({ prompt })`) to avoid duplication.
 * @param freshResults - Tool outputs the adapter executed this turn (approve-resume). Cycles
 *   with a fresh result are replayed as resolved call+result pairs.
 */
export function toLangChainMessages(
  history: AgentHistoryEntry[],
  system?: string,
  freshResults?: Map<string, ToolResultPayload>
): BaseMessage[] {
  const multiSender = distinctHumanSenders(history) > 1;
  const index = buildApprovalIndex(history, freshResults);
  const fromHistory = history.flatMap((entry) => mapHistoryEntry(entry, multiSender, index));

  if (!system) {
    return fromHistory;
  }

  return [new SystemMessage(system), ...fromHistory];
}
