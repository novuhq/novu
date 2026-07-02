import type { AssistantModelMessage, ModelMessage, ToolModelMessage } from 'ai';
import type { AgentHistoryEntry } from '../../resources/agent/agent.types';
import type { ApprovalPayload } from '../../resources/agent/tool-approval/action-id';

/**
 * Reconstructs tool-approval cycles from the Novu ledger into AI SDK messages.
 *
 * ## Why this module exists
 * Novu persists approval as separate ledger rows (request, decision, side-effect replies,
 * tool_result) in chronological order. The AI SDK message format requires every
 * `tool-call` to be immediately followed by its matching `tool-result` — all providers
 * enforce this once messages are converted to their native API shape.
 *
 * We pre-scan the ledger once, classify each cycle, then replay it in a provider-safe shape:
 *
 * | State     | Meaning                    | Emitted at request entry          |
 * |-----------|----------------------------|-----------------------------------|
 * | in-flight | Approved, tool not run yet | tool-call + tool-approval-request |
 * | denied    | User/system denied         | tool-call + execution-denied      |
 * | resolved  | Tool executed              | tool-call + tool-result           |
 *
 * Terminal states pair call + outcome at the **request** entry so interleaved ledger rows
 * (onToolApproval replies, superseding user messages, auto-deny) cannot split them.
 */

const TYPE_TOOL_APPROVAL_REQUEST = 'tool_approval_request';
const TYPE_TOOL_APPROVAL_DECISION = 'tool_approval_decision';
const TYPE_TOOL_RESULT = 'tool_result';

// ─── Payload extractors ───────────────────────────────────────────────────────

function approvalOf(entry: AgentHistoryEntry): ApprovalPayload | undefined {
  const tool = entry.toolData;
  if (!tool || typeof tool.approvalId !== 'string' || typeof tool.toolCallId !== 'string') {
    return undefined;
  }

  return { approvalId: tool.approvalId, toolCallId: tool.toolCallId, name: tool.toolName ?? 'tool', input: tool.input };
}

interface DecisionPayload {
  approvalId: string;
  approved: boolean;
}

function decisionOf(entry: AgentHistoryEntry): DecisionPayload | undefined {
  const tool = entry.toolData;
  if (!tool || typeof tool.approvalId !== 'string' || typeof tool.approved !== 'boolean') {
    return undefined;
  }

  return { approvalId: tool.approvalId, approved: tool.approved };
}

interface ToolResultPayload {
  toolCallId: string;
  toolName?: string;
  output: unknown;
}

function toolResultOf(entry: AgentHistoryEntry): ToolResultPayload | undefined {
  const tool = entry.toolData;
  if (!tool || typeof tool.toolCallId !== 'string') {
    return undefined;
  }

  return { toolCallId: tool.toolCallId, toolName: tool.toolName, output: tool.output };
}

// ─── Approval index (one pre-scan per turn) ───────────────────────────────────

/** Snapshot of all approval cycles in the ledger, built before mapping any entry. */
export interface ApprovalIndex {
  deniedApprovalIds: Set<string>;
  /** toolCallId → persisted result payload */
  toolResults: Map<string, ToolResultPayload>;
  approvalIdToToolCallId: Map<string, string>;
  /** Gated tool results already emitted adjacent to their request entry (skip standalone rows). */
  pairedAtRequest: Set<string>;
}

export function buildApprovalIndex(history: AgentHistoryEntry[]): ApprovalIndex {
  const deniedApprovalIds = new Set<string>();
  const toolResults = new Map<string, ToolResultPayload>();
  const approvalIdToToolCallId = new Map<string, string>();
  const gatedToolCallIds = new Set<string>();

  for (const entry of history) {
    if (entry.type === TYPE_TOOL_APPROVAL_REQUEST) {
      const approval = approvalOf(entry);
      if (approval) {
        approvalIdToToolCallId.set(approval.approvalId, approval.toolCallId);
        gatedToolCallIds.add(approval.toolCallId);
      }
    } else if (entry.type === TYPE_TOOL_APPROVAL_DECISION) {
      const decision = decisionOf(entry);
      if (decision && !decision.approved) {
        deniedApprovalIds.add(decision.approvalId);
      }
    } else if (entry.type === TYPE_TOOL_RESULT) {
      const result = toolResultOf(entry);
      if (result) {
        toolResults.set(result.toolCallId, result);
      }
    }
  }

  const pairedAtRequest = new Set<string>();
  for (const toolCallId of toolResults.keys()) {
    if (gatedToolCallIds.has(toolCallId)) {
      pairedAtRequest.add(toolCallId);
    }
  }

  return { deniedApprovalIds, toolResults, approvalIdToToolCallId, pairedAtRequest };
}

// ─── Cycle classification ─────────────────────────────────────────────────────

type ApprovalCycleState = 'in-flight' | 'denied' | 'resolved';

function cycleState(approval: ApprovalPayload, index: ApprovalIndex): ApprovalCycleState {
  if (index.deniedApprovalIds.has(approval.approvalId)) {
    return 'denied';
  }

  if (index.toolResults.has(approval.toolCallId)) {
    return 'resolved';
  }

  return 'in-flight';
}

// ─── AI SDK message builders ──────────────────────────────────────────────────

function assistantToolCall(approval: ApprovalPayload, withApprovalRequest: boolean): AssistantModelMessage {
  const content: AssistantModelMessage['content'] = [
    { type: 'tool-call', toolCallId: approval.toolCallId, toolName: approval.name, input: approval.input ?? {} },
  ];

  if (withApprovalRequest) {
    content.push({ type: 'tool-approval-request', approvalId: approval.approvalId, toolCallId: approval.toolCallId });
  }

  return { role: 'assistant', content };
}

function executionDeniedResult(toolCallId: string): ToolModelMessage {
  return {
    role: 'tool',
    content: [{ type: 'tool-result', toolCallId, toolName: 'tool', output: { type: 'execution-denied' } }],
  };
}

function executedToolResult(result: ToolResultPayload): ToolModelMessage {
  return {
    role: 'tool',
    content: [
      {
        type: 'tool-result',
        toolCallId: result.toolCallId,
        toolName: result.toolName ?? 'tool',
        output: { type: 'json', value: result.output as never },
      },
    ],
  };
}

/** Emit tool-call and its outcome in adjacent messages (AI SDK adjacency requirement). */
function pairedToolCall(approval: ApprovalPayload, outcome: ToolModelMessage): ModelMessage[] {
  return [assistantToolCall(approval, false), outcome];
}

// ─── Ledger entry mappers ─────────────────────────────────────────────────────

export function mapApprovalRequest(entry: AgentHistoryEntry, index: ApprovalIndex): ModelMessage[] {
  const approval = approvalOf(entry);
  if (!approval) {
    return [];
  }

  const state = cycleState(approval, index);

  switch (state) {
    case 'denied':
      return pairedToolCall(approval, executionDeniedResult(approval.toolCallId));
    case 'resolved': {
      const result = index.toolResults.get(approval.toolCallId);
      if (!result) {
        return [assistantToolCall(approval, false)];
      }

      return pairedToolCall(approval, executedToolResult(result));
    }
    case 'in-flight':
      // Decision entry adds tool-approval-response; resume triggers tool execution.
      return [assistantToolCall(approval, true)];
    default: {
      const unreachable: never = state;

      return unreachable;
    }
  }
}

export function mapApprovalDecision(entry: AgentHistoryEntry, index: ApprovalIndex): ModelMessage | undefined {
  const decision = decisionOf(entry);
  if (!decision) {
    return undefined;
  }

  // Denied and resolved cycles are fully handled at the request entry.
  if (!decision.approved) {
    return undefined;
  }

  const toolCallId = index.approvalIdToToolCallId.get(decision.approvalId);
  if (toolCallId && index.toolResults.has(toolCallId)) {
    return undefined;
  }

  return {
    role: 'tool',
    content: [{ type: 'tool-approval-response', approvalId: decision.approvalId, approved: true }],
  };
}

export function mapToolResult(entry: AgentHistoryEntry, index: ApprovalIndex): ModelMessage | undefined {
  const result = toolResultOf(entry);
  if (!result) {
    return undefined;
  }

  if (index.pairedAtRequest.has(result.toolCallId)) {
    return undefined;
  }

  return executedToolResult(result);
}
