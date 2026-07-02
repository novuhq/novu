import type { AssistantModelMessage, ModelMessage, ToolModelMessage } from 'ai';
import type { AgentHistoryEntry } from '../resources/agent/agent.types';
import type { ApprovalPayload } from '../resources/agent/tool-approval/action-id';

// History entry types this mapper handles.
const TYPE_MESSAGE = 'message';
const TYPE_TOOL_APPROVAL_REQUEST = 'tool_approval_request';
const TYPE_TOOL_APPROVAL_DECISION = 'tool_approval_decision';
const TYPE_TOOL_RESULT = 'tool_result';

function isAssistantRole(role: string): boolean {
  return role === 'agent' || role === 'assistant';
}

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
 * Correlations built once per turn. An approval cycle is "resolved" when the tool ran
 * (a result exists for its `toolCallId`) or the user denied it. Only the one cycle that's
 * approved-but-not-yet-run is replayed as a request/response pair, so the model runs it once.
 */
interface ApprovalIndex {
  resultToolCallIds: Set<string>;
  deniedApprovalIds: Set<string>;
  toolCallIdByApprovalId: Map<string, string>;
}

function buildApprovalIndex(history: AgentHistoryEntry[]): ApprovalIndex {
  const resultToolCallIds = new Set<string>();
  const deniedApprovalIds = new Set<string>();
  const toolCallIdByApprovalId = new Map<string, string>();

  for (const entry of history) {
    if (entry.type === TYPE_TOOL_APPROVAL_REQUEST) {
      const approval = approvalOf(entry);
      if (approval) {
        toolCallIdByApprovalId.set(approval.approvalId, approval.toolCallId);
      }
    } else if (entry.type === TYPE_TOOL_APPROVAL_DECISION) {
      const decision = decisionOf(entry);
      if (decision && !decision.approved) {
        deniedApprovalIds.add(decision.approvalId);
      }
    } else if (entry.type === TYPE_TOOL_RESULT) {
      const result = toolResultOf(entry);
      if (result) {
        resultToolCallIds.add(result.toolCallId);
      }
    }
  }

  return { resultToolCallIds, deniedApprovalIds, toolCallIdByApprovalId };
}

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

function mapApprovalRequest(entry: AgentHistoryEntry, index: ApprovalIndex): ModelMessage[] {
  const approval = approvalOf(entry);
  if (!approval) {
    return [];
  }

  const denied = index.deniedApprovalIds.has(approval.approvalId);
  const ran = index.resultToolCallIds.has(approval.toolCallId);

  if (denied) {
    // Pair tool-call + execution-denied at the request so later ledger entries (e.g. a
    // superseding user message or auto-deny decision) cannot split them in the transcript.
    return [assistantToolCall(approval, false), executionDeniedResult(approval.toolCallId)];
  }

  // Resolved cycle → just the completed tool call (its result message follows).
  // In-flight cycle → include the approval request so the paired response can run it.
  return [assistantToolCall(approval, !(ran || denied))];
}

function mapApprovalDecision(entry: AgentHistoryEntry, index: ApprovalIndex): ModelMessage | undefined {
  const decision = decisionOf(entry);
  if (!decision) {
    return undefined;
  }

  const toolCallId = index.toolCallIdByApprovalId.get(decision.approvalId);

  if (!decision.approved) {
    // Denied cycles emit execution-denied adjacent to the request entry.
    return undefined;
  }

  // Approved and already run → its result message carries the outcome; skip this.
  if (toolCallId && index.resultToolCallIds.has(toolCallId)) {
    return undefined;
  }

  // Approved but not yet run → emit the response that makes the model run the tool.
  return {
    role: 'tool',
    content: [{ type: 'tool-approval-response', approvalId: decision.approvalId, approved: true }],
  };
}

function mapToolResult(entry: AgentHistoryEntry): ModelMessage | undefined {
  const result = toolResultOf(entry);
  if (!result) {
    return undefined;
  }

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
      const resultMessage = mapToolResult(entry);

      return resultMessage ? [resultMessage] : [];
    }
    default:
      // Other entry types (`edit`, `signal`, unknown) aren't part of the model transcript.
      return [];
  }
}

/**
 * Convert `ctx.history` into AI SDK `ModelMessage[]` ready to pass to `streamText`/`generateText`.
 * Optionally prepends a `system` prompt.
 *
 * `history` already includes the current incoming message, so don't add the handler's
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
