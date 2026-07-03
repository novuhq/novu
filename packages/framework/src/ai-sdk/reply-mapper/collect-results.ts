import type { ToolModelMessage } from 'ai';
import type { AgentRuntimeContext } from '../../resources/agent/agent.runtime';
import type { AiSdkResult } from '../types';

interface ExecutedToolResult {
  toolCallId: string;
  toolName?: string;
  output: unknown;
}

interface ToolResultPart {
  type: 'tool-result';
  toolCallId: string;
  toolName?: string;
  output?: unknown;
}

function isToolMessage(message: { role: string; content?: unknown }): message is ToolModelMessage {
  return message.role === 'tool' && Array.isArray(message.content);
}

function isToolResultPart(part: unknown): part is ToolResultPart {
  return typeof part === 'object' && part !== null && (part as ToolResultPart).type === 'tool-result';
}

function isDeniedOutput(output: unknown): boolean {
  return (
    typeof output === 'object' &&
    output !== null &&
    'type' in output &&
    (output as { type: string }).type === 'execution-denied'
  );
}

function unwrapToolOutput(output: unknown): unknown {
  if (output && typeof output === 'object' && 'type' in output && 'value' in output) {
    const typed = output as { type: string; value: unknown };
    if (typed.type === 'json' || typed.type === 'text') {
      return typed.value;
    }
  }

  return output;
}

/**
 * Collect executed tool results from `response.messages` (the SDK's `responseMessages`).
 *
 * Per AI SDK docs, `responseMessages` is the accumulated assistant/tool history for the
 * call — including tool results from approved tools executed before the first model step.
 * @see https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#response-messages
 */
async function collectExecutedToolResults(result: AiSdkResult): Promise<ExecutedToolResult[]> {
  const { messages = [] } = await Promise.resolve(result.response);

  return messages
    .filter(isToolMessage)
    .flatMap((message) => message.content as unknown[])
    .filter(isToolResultPart)
    .filter((part) => !isDeniedOutput(part.output))
    .map((part) => ({
      toolCallId: part.toolCallId,
      toolName: part.toolName,
      output: unwrapToolOutput(part.output),
    }));
}

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

/** Save tool results to Novu history — but only for tools that required user approval. */
export async function emitExecutedToolResults(result: AiSdkResult, ctx: AgentRuntimeContext): Promise<void> {
  const executed = await collectExecutedToolResults(result);
  if (executed.length === 0) {
    return;
  }

  // scan ctx.history for past tool_approval_request entries and collect their toolCallIds
  const gated = gatedToolCallIds(ctx);

  for (const toolResult of executed) {
    if (!gated.has(toolResult.toolCallId)) {
      continue;
    }

    ctx.emitToolResult({
      toolCallId: toolResult.toolCallId,
      toolName: toolResult.toolName,
      output: toolResult.output,
      preview: `Tool "${toolResult.toolName ?? toolResult.toolCallId}" result`,
    });
  }
}
