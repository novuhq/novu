import type { AssistantModelMessage, ModelMessage, ToolModelMessage } from 'ai';
import type { AgentHistoryEntry } from '../resources/agent/agent.types';
import type { ApprovalPayload } from '../resources/agent/tool-approval/action-id';

interface ApprovalDecision {
  approvalId: string;
  approved: boolean;
}

function isAssistantRole(role: string): boolean {
  return role === 'agent' || role === 'assistant';
}

function approvalCardOf(entry: AgentHistoryEntry): ApprovalPayload | undefined {
  return (entry.richContent as { toolApproval?: ApprovalPayload } | undefined)?.toolApproval;
}

function approvalDecisionOf(entry: AgentHistoryEntry): ApprovalDecision | undefined {
  if (entry.signalData?.type !== 'tool-approval-response') {
    return undefined;
  }

  const { approvalId, approved } = (entry.signalData.payload ?? {}) as Partial<ApprovalDecision>;
  if (typeof approvalId !== 'string' || typeof approved !== 'boolean') {
    return undefined;
  }

  return { approvalId, approved };
}

function isConversationalEntry(entry: AgentHistoryEntry): boolean {
  return Boolean(entry.content.trim()) && !entry.signalData;
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

/**
 * The only approval cycle that needs its structured tool-call / approval-request /
 * approval-response replayed is the one currently being resumed — i.e. whose
 * decision signal is the most recent thing in the conversation. `streamText`
 * consumes those parts to execute the tool exactly once and produce the
 * `tool-result` itself.
 *
 * Once the conversation moves past a cycle (a later message or another approval
 * card exists), it is resolved: its result lived only in that resume turn's
 * `streamText` run, never in the transcript. Replaying its `tool-call` on later
 * turns would leave a `tool_use` with no `tool_result` (Anthropic rejects this)
 * and could re-execute the tool. Resolved cycles therefore collapse to the
 * agent's natural-language reply — mirroring the managed runtime, whose display
 * transcript also never carries tool results for replay.
 */
function inFlightApprovalId(history: AgentHistoryEntry[]): string | undefined {
  const lastRelevant = [...history]
    .reverse()
    .find((entry) => approvalDecisionOf(entry) || isConversationalEntry(entry) || approvalCardOf(entry));

  return lastRelevant ? approvalDecisionOf(lastRelevant)?.approvalId : undefined;
}

function mapToolApprovalResponse(
  entry: AgentHistoryEntry,
  inFlightId: string | undefined
): ToolModelMessage | undefined {
  const decision = approvalDecisionOf(entry);
  if (!decision || decision.approvalId !== inFlightId) {
    return undefined;
  }

  return {
    role: 'tool',
    content: [{ type: 'tool-approval-response', approvalId: decision.approvalId, approved: decision.approved }],
  };
}

function mapApprovalCard(entry: AgentHistoryEntry, inFlightId: string | undefined): AssistantModelMessage | undefined {
  const approval = approvalCardOf(entry);
  if (!approval || approval.approvalId !== inFlightId) {
    return undefined;
  }

  return {
    role: 'assistant',
    content: [
      { type: 'tool-call', toolCallId: approval.toolCallId, toolName: approval.name, input: approval.input ?? {} },
      { type: 'tool-approval-request', approvalId: approval.approvalId, toolCallId: approval.toolCallId },
    ],
  };
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

function mapHistoryEntry(
  entry: AgentHistoryEntry,
  multiSender: boolean,
  inFlightId: string | undefined
): ModelMessage | undefined {
  return (
    mapToolApprovalResponse(entry, inFlightId) ??
    mapApprovalCard(entry, inFlightId) ??
    mapTextMessage(entry, multiSender)
  );
}

// Novu already appends the current inbound message to `history` before the bridge
// fires, so callers must not append the handler's `message` arg again.
export function toModelMessages(history: AgentHistoryEntry[], system?: string): ModelMessage[] {
  const multiSender = distinctHumanSenders(history) > 1;
  const inFlightId = inFlightApprovalId(history);
  const fromHistory = history
    .map((entry) => mapHistoryEntry(entry, multiSender, inFlightId))
    .filter((message): message is ModelMessage => message !== undefined);

  if (!system) {
    return fromHistory;
  }

  return [{ role: 'system', content: system }, ...fromHistory];
}
