import type { AssistantModelMessage, ModelMessage, ToolModelMessage } from 'ai';
import type { AgentHistoryEntry } from '../../resources/agent/agent.types';
import type { ToolApprovalRequestPayload } from '../../resources/agent/tool-approval/action-id';

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
 * | State     | Meaning                                      | Emitted at request entry                         |
 * |-----------|----------------------------------------------|--------------------------------------------------|
 * | in-flight | Approved just now; tip of history (resume)   | tool-call + approval-request + approval-response |
 * | orphaned  | Approved earlier; conversation continued       | tool-call + execution-denied                     |
 * | denied    | User/system denied                           | tool-call + execution-denied                     |
 * | resolved  | Tool executed                                | tool-call + tool-result                          |
 * | pending   | Card shown; no decision yet                  | tool-call + tool-approval-request                |
 *
 * Terminal / resume states pair call + outcome at the **request** entry so interleaved
 * ledger rows (approval cards, onToolApproval replies, error notices) cannot split them.
 *
 * Orphaned approved cycles (decision present, no tool_result, later model-relevant rows)
 * are mapped as execution-denied so a failed resume cannot permanently poison the thread.
 */

const TYPE_MESSAGE = 'message';
const TYPE_TOOL_APPROVAL_REQUEST = 'tool_approval_request';
const TYPE_TOOL_APPROVAL_DECISION = 'tool_approval_decision';
const TYPE_TOOL_RESULT = 'tool_result';

// ─── Payload extractors ───────────────────────────────────────────────────────

function approvalOf(entry: AgentHistoryEntry): ToolApprovalRequestPayload | undefined {
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

function isModelRelevant(entry: AgentHistoryEntry): boolean {
  switch (entry.type) {
    case TYPE_MESSAGE:
      return entry.content.trim().length > 0;
    case TYPE_TOOL_APPROVAL_REQUEST:
    case TYPE_TOOL_APPROVAL_DECISION:
    case TYPE_TOOL_RESULT:
      return true;
    default:
      // `edit`, `signal`, and unknown types are UI/runtime artifacts.
      return false;
  }
}

function approvalResponseMessage(approvalId: string): ToolModelMessage {
  return {
    role: 'tool',
    content: [{ type: 'tool-approval-response', approvalId, approved: true }],
  };
}

// ─── Approval index (one pre-scan per turn) ───────────────────────────────────

/** Snapshot of all approval cycles in the ledger, built before mapping any entry. */
export interface ApprovalIndex {
  deniedApprovalIds: Set<string>;
  /** Approved without a tool_result, and the decision is still the tip of history. */
  activeResumeApprovalIds: Set<string>;
  /** Approved without a tool_result, but later model-relevant rows exist (failed resume). */
  orphanedApprovedIds: Set<string>;
  /** toolCallId → persisted result payload */
  toolResults: Map<string, ToolResultPayload>;
  approvalIdToToolCallId: Map<string, string>;
  /** Gated tool results already emitted adjacent to their request entry (skip standalone rows). */
  pairedAtRequest: Set<string>;
  /** Approval-card message rows between a request and its decision — skip in the transcript. */
  skipEntryIndices: Set<number>;
}

export function buildApprovalIndex(history: AgentHistoryEntry[]): ApprovalIndex {
  const deniedApprovalIds = new Set<string>();
  const toolResults = new Map<string, ToolResultPayload>();
  const approvalIdToToolCallId = new Map<string, string>();
  const gatedToolCallIds = new Set<string>();
  const approvedPendingIds = new Set<string>();
  const decisionIndexByApprovalId = new Map<string, number>();
  const skipEntryIndices = new Set<number>();

  for (let i = 0; i < history.length; i++) {
    const entry = history[i];

    if (entry.type === TYPE_TOOL_APPROVAL_REQUEST) {
      const approval = approvalOf(entry);
      if (approval) {
        approvalIdToToolCallId.set(approval.approvalId, approval.toolCallId);
        gatedToolCallIds.add(approval.toolCallId);
      }
    } else if (entry.type === TYPE_TOOL_APPROVAL_DECISION) {
      const decision = decisionOf(entry);
      if (decision) {
        decisionIndexByApprovalId.set(decision.approvalId, i);
        if (!decision.approved) {
          deniedApprovalIds.add(decision.approvalId);
        }
      }
    } else if (entry.type === TYPE_TOOL_RESULT) {
      const result = toolResultOf(entry);
      if (result) {
        toolResults.set(result.toolCallId, result);
      }
    }
  }

  for (let i = 0; i < history.length; i++) {
    if (history[i].type !== TYPE_TOOL_APPROVAL_REQUEST) {
      continue;
    }

    const approval = approvalOf(history[i]);
    if (!approval) {
      continue;
    }

    const decisionIdx = decisionIndexByApprovalId.get(approval.approvalId);
    if (decisionIdx === undefined || decisionIdx <= i) {
      continue;
    }

    for (let k = i + 1; k < decisionIdx; k++) {
      if (history[k].type === TYPE_MESSAGE) {
        skipEntryIndices.add(k);
      }
    }
  }

  for (const [approvalId, toolCallId] of approvalIdToToolCallId) {
    if (deniedApprovalIds.has(approvalId) || toolResults.has(toolCallId)) {
      continue;
    }

    if (decisionIndexByApprovalId.has(approvalId)) {
      approvedPendingIds.add(approvalId);
    }
  }

  const activeResumeApprovalIds = new Set<string>();
  const orphanedApprovedIds = new Set<string>();

  for (const approvalId of approvedPendingIds) {
    const decisionIdx = decisionIndexByApprovalId.get(approvalId);
    if (decisionIdx === undefined) {
      continue;
    }

    let hasLaterModelRelevant = false;
    for (let i = decisionIdx + 1; i < history.length; i++) {
      if (skipEntryIndices.has(i)) {
        continue;
      }

      if (isModelRelevant(history[i])) {
        hasLaterModelRelevant = true;
        break;
      }
    }

    if (hasLaterModelRelevant) {
      orphanedApprovedIds.add(approvalId);
    } else {
      activeResumeApprovalIds.add(approvalId);
    }
  }

  const pairedAtRequest = new Set<string>();
  for (const toolCallId of toolResults.keys()) {
    if (gatedToolCallIds.has(toolCallId)) {
      pairedAtRequest.add(toolCallId);
    }
  }

  return {
    deniedApprovalIds,
    activeResumeApprovalIds,
    orphanedApprovedIds,
    toolResults,
    approvalIdToToolCallId,
    pairedAtRequest,
    skipEntryIndices,
  };
}

// ─── Cycle classification ─────────────────────────────────────────────────────

type ApprovalCycleState = 'in-flight' | 'orphaned' | 'denied' | 'resolved' | 'pending';

function cycleState(approval: ToolApprovalRequestPayload, index: ApprovalIndex): ApprovalCycleState {
  if (index.deniedApprovalIds.has(approval.approvalId)) {
    return 'denied';
  }

  if (index.orphanedApprovedIds.has(approval.approvalId)) {
    return 'orphaned';
  }

  if (index.toolResults.has(approval.toolCallId)) {
    return 'resolved';
  }

  if (index.activeResumeApprovalIds.has(approval.approvalId)) {
    return 'in-flight';
  }

  return 'pending';
}

// ─── AI SDK message builders ──────────────────────────────────────────────────

function assistantToolCall(approval: ToolApprovalRequestPayload, withApprovalRequest: boolean): AssistantModelMessage {
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
function pairedToolCall(approval: ToolApprovalRequestPayload, outcome: ToolModelMessage): ModelMessage[] {
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
    case 'orphaned':
      return pairedToolCall(approval, executionDeniedResult(approval.toolCallId));
    case 'resolved': {
      const result = index.toolResults.get(approval.toolCallId);
      if (!result) {
        return [assistantToolCall(approval, false)];
      }

      return pairedToolCall(approval, executedToolResult(result));
    }
    case 'in-flight':
      // Pair approval-response here so approval-card messages cannot sit between call and response.
      return [assistantToolCall(approval, true), approvalResponseMessage(approval.approvalId)];
    case 'pending':
      return [assistantToolCall(approval, true)];
    default: {
      const unreachable: never = state;

      return unreachable;
    }
  }
}

export function mapApprovalDecision(_entry: AgentHistoryEntry, _index: ApprovalIndex): ModelMessage | undefined {
  // Denied, orphaned, resolved, and active-resume cycles are fully handled at the request entry.
  return undefined;
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
