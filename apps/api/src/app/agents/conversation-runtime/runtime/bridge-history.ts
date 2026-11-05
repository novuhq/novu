import { type ConversationActivityToolData, ConversationActivityTypeEnum } from '@novu/dal';
import type { AgentHistoryEntry } from '@novu/framework';
import { capToolOutput } from '../conversation/tool-result-content';

/**
 * Total byte budget for the serialized bridge `history`. Self-hosted bridges rebuild the model
 * transcript from the full ledger every turn, so an unbounded history overruns both the bridge's
 * HTTP body limit (`PayloadTooLargeError`) and the provider context window.
 */
export const BRIDGE_HISTORY_MAX_BYTES = 512 * 1024;

export interface ShapedBridgeHistory {
  history: AgentHistoryEntry[];
  droppedOrphans: number;
  droppedForBudget: number;
}

/**
 * `toolData.output` can be uncapped (rows written before the write-time cap), so it is capped again
 * here. `toolData.content` is the dashboard's copy of the result (up to 64KB); the framework reads
 * `output` instead, so it is left out.
 */
export function slimToolDataForBridge(
  toolData: ConversationActivityToolData | undefined
): ConversationActivityToolData | undefined {
  if (!toolData) {
    return undefined;
  }

  const { content: _dashboardCopy, ...bridgeToolData } = toolData;
  if (bridgeToolData.output === undefined) {
    return bridgeToolData;
  }

  const { output, truncated } = capToolOutput(bridgeToolData.output);
  if (!truncated) {
    return bridgeToolData;
  }

  return { ...bridgeToolData, output, truncated: true };
}

/** Drop tool rows cut off from their request, then trim the oldest rows to fit `maxBytes`. */
export function shapeBridgeHistory(entries: AgentHistoryEntry[], maxBytes: number): ShapedBridgeHistory {
  const complete = dropOrphanedToolRows(entries);
  const history = applyHistoryBudget(complete, maxBytes);

  return {
    history,
    droppedOrphans: entries.length - complete.length,
    droppedForBudget: complete.length - history.length,
  };
}

/**
 * The history window is the newest rows by count, so it can start mid-cycle: a decision or result whose
 * approval request (or tool call) is older than the window. Providers reject a tool result with no
 * matching call, so those leftover rows are dropped.
 */
function dropOrphanedToolRows(entries: AgentHistoryEntry[]): AgentHistoryEntry[] {
  const calledToolCallIds = new Set<string>();
  const requestedApprovalIds = new Set<string>();

  for (const entry of entries) {
    if (
      entry.type !== ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST &&
      entry.type !== ConversationActivityTypeEnum.TOOL_CALL
    ) {
      continue;
    }
    if (entry.toolData?.toolCallId) {
      calledToolCallIds.add(entry.toolData.toolCallId);
    }
    if (entry.toolData?.approvalId) {
      requestedApprovalIds.add(entry.toolData.approvalId);
    }
  }

  return entries.filter((entry) => {
    if (entry.type === ConversationActivityTypeEnum.TOOL_RESULT) {
      return !!entry.toolData?.toolCallId && calledToolCallIds.has(entry.toolData.toolCallId);
    }
    if (entry.type === ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION) {
      return !!entry.toolData?.approvalId && requestedApprovalIds.has(entry.toolData.approvalId);
    }

    return true;
  });
}

/**
 * Drop the oldest rows until the serialized history fits `maxBytes`. A tool cycle (request, decision,
 * result) is dropped as a whole so no result is stranded. The newest group is always kept, since it
 * holds the current turn or the approval being resumed, even when it alone exceeds the budget.
 */
function applyHistoryBudget(entries: AgentHistoryEntry[], maxBytes: number): AgentHistoryEntry[] {
  // One extra byte per entry for its comma or the closing bracket, plus one for the opening bracket.
  const sizes = entries.map((entry) => Buffer.byteLength(JSON.stringify(entry), 'utf8') + 1);
  let total = sizes.reduce((sum, size) => sum + size, 1);
  if (total <= maxBytes) {
    return entries;
  }

  const groups = groupToolCycles(entries);
  const groupSizes = new Map<number, number>();
  groups.forEach((group, index) => {
    groupSizes.set(group, (groupSizes.get(group) ?? 0) + sizes[index]);
  });

  const newestGroup = groups[groups.length - 1];
  const dropped = new Set<number>();
  for (const [group, size] of groupSizes) {
    if (total <= maxBytes) {
      break;
    }
    if (group === newestGroup) {
      continue;
    }

    dropped.add(group);
    total -= size;
  }

  return entries.filter((_, index) => !dropped.has(groups[index]));
}

/**
 * Give each row the index of the first row in its tool cycle; rows outside a cycle get their own index.
 * A cycle is keyed by the request's `toolCallId`, or by its `approvalId` when the request has no
 * `toolCallId`. Ids increase with first appearance, so iterating them goes oldest first.
 */
function groupToolCycles(entries: AgentHistoryEntry[]): number[] {
  const callIdByApprovalId = new Map<string, string>();
  for (const entry of entries) {
    const { approvalId, toolCallId } = entry.toolData ?? {};
    if (entry.type === ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST && approvalId && toolCallId) {
      callIdByApprovalId.set(approvalId, toolCallId);
    }
  }

  const firstIndexByKey = new Map<string, number>();

  return entries.map((entry, index) => {
    const { approvalId, toolCallId } = entry.toolData ?? {};
    let key = toolCallId;
    if (!key && approvalId) {
      key = callIdByApprovalId.get(approvalId) ?? approvalId;
    }
    if (!key) {
      return index;
    }

    const first = firstIndexByKey.get(key) ?? index;
    firstIndexByKey.set(key, first);

    return first;
  });
}
