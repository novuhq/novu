import { AIMessage, type BaseMessage, ToolMessage } from '@langchain/core/messages';
import type { AgentHistoryEntry } from '../../resources/agent/agent.types';
import type { ToolApprovalRequestPayload } from '../../resources/agent/tool-approval/action-id';

/**
 * Reconstructs tool-approval cycles from the Novu ledger into LangChain messages.
 *
 * ## Why this module exists
 * Novu persists approval as separate ledger rows (request, decision, side-effect replies,
 * tool_result) in chronological order. LangChain / chat providers require every AIMessage
 * `tool_call` to be paired with a matching `ToolMessage` (`tool_call_id`) — an unmatched
 * call is rejected once converted to the provider's native API shape.
 *
 * We pre-scan the ledger once, classify each cycle, then replay it as a provider-safe pair:
 *
 * | State     | Meaning                    | Emitted at request entry        |
 * |-----------|----------------------------|---------------------------------|
 * | resolved  | Tool executed              | AIMessage(tool_call) + Tool msg |
 * | denied    | User/system denied         | AIMessage(tool_call) + denied   |
 * | in-flight | Approved, tool not run yet | resolved once its result is     |
 * |           |                            | supplied via `freshResults`     |
 *
 * On resume the adapter executes the just-approved tool itself and passes the output in
 * `freshResults`, so an in-flight cycle is emitted as a resolved call+result pair. A cycle
 * that is still genuinely pending (no decision, no result) is dropped to avoid a dangling
 * `tool_call` — this only happens outside the normal pause/resume flow.
 */

const TYPE_TOOL_APPROVAL_REQUEST = 'tool_approval_request';
const TYPE_TOOL_APPROVAL_DECISION = 'tool_approval_decision';
const TYPE_TOOL_RESULT = 'tool_result';

const EXECUTION_DENIED = JSON.stringify({ type: 'execution-denied' });

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

export interface ToolResultPayload {
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
  /** toolCallId → result payload (ledger `tool_result` rows, plus any `freshResults`). */
  toolResults: Map<string, ToolResultPayload>;
  approvalIdToToolCallId: Map<string, string>;
}

export function buildApprovalIndex(
  history: AgentHistoryEntry[],
  freshResults?: Map<string, ToolResultPayload>
): ApprovalIndex {
  const deniedApprovalIds = new Set<string>();
  const toolResults = new Map<string, ToolResultPayload>();
  const approvalIdToToolCallId = new Map<string, string>();

  for (const entry of history) {
    if (entry.type === TYPE_TOOL_APPROVAL_REQUEST) {
      const approval = approvalOf(entry);
      if (approval) {
        approvalIdToToolCallId.set(approval.approvalId, approval.toolCallId);
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

  if (freshResults) {
    for (const [toolCallId, result] of freshResults) {
      toolResults.set(toolCallId, result);
    }
  }

  return { deniedApprovalIds, toolResults, approvalIdToToolCallId };
}

// ─── Cycle classification ─────────────────────────────────────────────────────

type ApprovalCycleState = 'in-flight' | 'denied' | 'resolved';

function cycleState(approval: ToolApprovalRequestPayload, index: ApprovalIndex): ApprovalCycleState {
  if (index.deniedApprovalIds.has(approval.approvalId)) {
    return 'denied';
  }

  if (index.toolResults.has(approval.toolCallId)) {
    return 'resolved';
  }

  return 'in-flight';
}

// ─── LangChain message builders ───────────────────────────────────────────────

function assistantToolCall(approval: ToolApprovalRequestPayload): AIMessage {
  return new AIMessage({
    content: '',
    tool_calls: [{ id: approval.toolCallId, name: approval.name, args: approval.input ?? {}, type: 'tool_call' }],
  });
}

function toContent(output: unknown): string {
  return typeof output === 'string' ? output : JSON.stringify(output);
}

function executedToolResult(result: ToolResultPayload): ToolMessage {
  return new ToolMessage({
    content: toContent(result.output),
    tool_call_id: result.toolCallId,
    name: result.toolName ?? 'tool',
  });
}

function executionDeniedResult(approval: ToolApprovalRequestPayload): ToolMessage {
  return new ToolMessage({
    content: EXECUTION_DENIED,
    tool_call_id: approval.toolCallId,
    name: approval.name,
    status: 'error',
  });
}

// ─── Ledger entry mapper ──────────────────────────────────────────────────────

export function mapApprovalRequest(entry: AgentHistoryEntry, index: ApprovalIndex): BaseMessage[] {
  const approval = approvalOf(entry);
  if (!approval) {
    return [];
  }

  const state = cycleState(approval, index);

  switch (state) {
    case 'denied':
      return [assistantToolCall(approval), executionDeniedResult(approval)];
    case 'resolved': {
      const result = index.toolResults.get(approval.toolCallId);
      if (!result) {
        return [];
      }

      return [assistantToolCall(approval), executedToolResult(result)];
    }
    case 'in-flight':
      // Still pending (no decision/result yet): drop to avoid a dangling tool_call.
      // The normal pause/resume flow never maps history in this state.
      return [];
    default: {
      const unreachable: never = state;

      return unreachable;
    }
  }
}

// ─── Resume helpers ───────────────────────────────────────────────────────────

export interface ApprovedToolCall {
  toolCallId: string;
  toolName: string;
  input?: Record<string, unknown>;
}

/**
 * Gated tool calls that were approved but have not executed yet (no `tool_result` row).
 * The adapter runs these on resume, records the outcome, and continues the graph.
 */
export function findApprovedUnexecuted(history: AgentHistoryEntry[]): ApprovedToolCall[] {
  const approvedApprovalIds = new Set<string>();
  const executedToolCallIds = new Set<string>();
  const requests: Array<{ approvalId: string; toolCallId: string; toolName: string; input?: Record<string, unknown> }> =
    [];

  for (const entry of history) {
    if (entry.type === TYPE_TOOL_APPROVAL_REQUEST) {
      const approval = approvalOf(entry);
      if (approval) {
        requests.push({
          approvalId: approval.approvalId,
          toolCallId: approval.toolCallId,
          toolName: approval.name,
          input: approval.input,
        });
      }
    } else if (entry.type === TYPE_TOOL_APPROVAL_DECISION) {
      const decision = decisionOf(entry);
      if (decision?.approved) {
        approvedApprovalIds.add(decision.approvalId);
      }
    } else if (entry.type === TYPE_TOOL_RESULT) {
      const result = toolResultOf(entry);
      if (result) {
        executedToolCallIds.add(result.toolCallId);
      }
    }
  }

  return requests
    .filter((request) => approvedApprovalIds.has(request.approvalId) && !executedToolCallIds.has(request.toolCallId))
    .map(({ toolCallId, toolName, input }) => ({ toolCallId, toolName, input }));
}
