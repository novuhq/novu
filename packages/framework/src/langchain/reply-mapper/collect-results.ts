import { type BaseMessage, isToolMessage, type ToolMessage } from '@langchain/core/messages';
import type { AgentRuntimeContext } from '../../resources/agent/agent.runtime';

/** Tool calls that were gated behind approval — only these get persisted as ledger tool_result rows. */
function gatedToolCallIds(ctx: AgentRuntimeContext): Set<string> {
  const ids = new Set<string>();
  for (const entry of ctx.history) {
    if (entry.type === 'tool_approval_request' && entry.toolData?.toolCallId) {
      ids.add(entry.toolData.toolCallId);
    }
  }

  return ids;
}

/** toolCallIds already recorded — persisted in a prior turn or executed by the adapter this turn. */
function alreadyRecordedToolCallIds(ctx: AgentRuntimeContext, executed: Set<string>): Set<string> {
  const ids = new Set<string>(executed);
  for (const entry of ctx.history) {
    if (entry.type === 'tool_result' && entry.toolData?.toolCallId) {
      ids.add(entry.toolData.toolCallId);
    }
  }

  return ids;
}

function toStringContent(content: ToolMessage['content']): string {
  return typeof content === 'string' ? content : JSON.stringify(content);
}

/**
 * Persist tool results to Novu history — but only for approval-gated tools that the graph
 * executed and that were not already recorded (in the ledger or by the adapter this turn).
 *
 * In the normal flow gated tools are executed by the adapter on resume, so this is defensive:
 * it keeps the ledger correct if a gated tool ever runs inside the graph.
 */
export function emitExecutedToolResults(
  messages: BaseMessage[],
  ctx: AgentRuntimeContext,
  executed: Set<string> = new Set()
): void {
  const gated = gatedToolCallIds(ctx);
  if (gated.size === 0) {
    return;
  }

  const recorded = alreadyRecordedToolCallIds(ctx, executed);

  for (const message of messages) {
    if (!isToolMessage(message)) {
      continue;
    }

    const toolCallId = message.tool_call_id;
    if (!gated.has(toolCallId) || recorded.has(toolCallId)) {
      continue;
    }

    recorded.add(toolCallId);
    ctx.emitToolResult({
      toolCallId,
      toolName: message.name,
      output: toStringContent(message.content),
      preview: `Tool "${message.name ?? toolCallId}" result`,
    });
  }
}
