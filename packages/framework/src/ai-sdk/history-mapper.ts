import type { ModelMessage } from 'ai';
import type { AgentHistoryEntry } from '../resources/agent/agent.types';
import type { ApprovalPayload } from '../resources/agent/tool-approval/action-id';

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

function mapToolApprovalResponse(entry: AgentHistoryEntry): ModelMessage | undefined {
  if (entry.signalData?.type !== 'tool-approval-response') {
    return undefined;
  }

  const { approvalId, approved } = (entry.signalData.payload ?? {}) as { approvalId?: string; approved?: boolean };
  if (typeof approvalId !== 'string' || typeof approved !== 'boolean') {
    return undefined;
  }

  return {
    role: 'tool',
    content: [{ type: 'tool-approval-response', approvalId, approved }],
  } as ModelMessage;
}

function mapApprovalCard(entry: AgentHistoryEntry): ModelMessage | undefined {
  const approval = (entry.richContent as { toolApproval?: ApprovalPayload } | undefined)?.toolApproval;
  if (!approval) {
    return undefined;
  }

  return {
    role: 'assistant',
    content: [
      { type: 'tool-call', toolCallId: approval.toolCallId, toolName: approval.name, input: approval.input ?? {} },
      { type: 'tool-approval-request', approvalId: approval.approvalId, toolCallId: approval.toolCallId },
    ],
  } as ModelMessage;
}

function isSkippedEntry(entry: AgentHistoryEntry): boolean {
  return Boolean(entry.signalData) || entry.role === 'system' || entry.type === 'signal' || !entry.content.trim();
}

function mapTextMessage(entry: AgentHistoryEntry, multiSender: boolean): ModelMessage | undefined {
  if (isSkippedEntry(entry)) {
    return undefined;
  }

  const isAssistant = isAssistantRole(entry.role);
  const text =
    !isAssistant && multiSender && entry.senderName ? `${entry.senderName}: ${entry.content}` : entry.content;

  return { role: isAssistant ? 'assistant' : 'user', content: text };
}

function mapHistoryEntry(entry: AgentHistoryEntry, multiSender: boolean): ModelMessage | undefined {
  return mapToolApprovalResponse(entry) ?? mapApprovalCard(entry) ?? mapTextMessage(entry, multiSender);
}

// Novu already appends the current inbound message to `history` before the bridge
// fires, so callers must not append the handler's `message` arg again.
export function toModelMessages(history: AgentHistoryEntry[], system?: string): ModelMessage[] {
  const multiSender = distinctHumanSenders(history) > 1;
  const fromHistory = history
    .map((entry) => mapHistoryEntry(entry, multiSender))
    .filter((message): message is ModelMessage => message !== undefined);

  if (!system) {
    return fromHistory;
  }

  return [{ role: 'system', content: system }, ...fromHistory];
}
