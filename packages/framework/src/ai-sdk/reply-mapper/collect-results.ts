import type { StepResult, ToolSet } from 'ai';
import type { AgentContextBase } from '../../resources/agent/agent.types';
import type { AiSdkResult } from '../types';

interface ExecutedToolResult {
  toolCallId: string;
  toolName?: string;
  output: unknown;
}

interface AiSdkContext extends AgentContextBase {
  emitToolResult(result: { toolCallId: string; toolName?: string; output: unknown; preview: string }): void;
}

function unwrapToolOutput(output: unknown): unknown {
  if (
    output &&
    typeof output === 'object' &&
    'type' in output &&
    (output as { type: string }).type === 'json' &&
    'value' in output
  ) {
    return (output as { value: unknown }).value;
  }

  return output;
}

/** Pull executed tool results out of a step's `toolResults` array. */
async function collectToolResultsFromSteps(result: AiSdkResult): Promise<ExecutedToolResult[]> {
  const steps = (await result.steps) as StepResult<ToolSet>[] | undefined;
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.flatMap((step) =>
    step.toolResults.map((r) => ({ toolCallId: r.toolCallId, toolName: r.toolName, output: r.output }))
  );
}

/**
 * After approval-resume, executed tools often appear in `response.messages` rather than `steps`.
 * See AI SDK `stream-text.ts` — initial `executeToolCall` after `collectToolApprovals`.
 */
async function collectToolResultsFromResponse(result: AiSdkResult): Promise<ExecutedToolResult[]> {
  if (result.response == null) {
    return [];
  }

  const response = await result.response;
  if (!Array.isArray(response.messages)) {
    return [];
  }

  const collected: ExecutedToolResult[] = [];

  for (const message of response.messages) {
    if (message.role !== 'tool' || !Array.isArray(message.content)) {
      continue;
    }

    for (const part of message.content) {
      if (typeof part !== 'object' || part === null || (part as { type?: string }).type !== 'tool-result') {
        continue;
      }

      const toolResult = part as { toolCallId: string; toolName?: string; output?: unknown };
      if (
        toolResult.output &&
        typeof toolResult.output === 'object' &&
        'type' in toolResult.output &&
        (toolResult.output as { type: string }).type === 'execution-denied'
      ) {
        continue;
      }

      collected.push({
        toolCallId: toolResult.toolCallId,
        toolName: toolResult.toolName,
        output: unwrapToolOutput(toolResult.output),
      });
    }
  }

  return collected;
}

async function collectExecutedToolResults(result: AiSdkResult): Promise<ExecutedToolResult[]> {
  const fromSteps = await collectToolResultsFromSteps(result);
  const fromResponse = await collectToolResultsFromResponse(result);
  const byId = new Map<string, ExecutedToolResult>();

  for (const toolResult of fromSteps) {
    byId.set(toolResult.toolCallId, toolResult);
  }

  for (const toolResult of fromResponse) {
    if (!byId.has(toolResult.toolCallId)) {
      byId.set(toolResult.toolCallId, toolResult);
    }
  }

  return [...byId.values()];
}

/** Tool calls that were gated behind approval — only these get persisted as ledger tool_result rows. */
function gatedToolCallIds(ctx: AgentContextBase): Set<string> {
  const ids = new Set<string>();
  for (const entry of ctx.history) {
    if (entry.type === 'tool_approval_request' && entry.toolData?.toolCallId) {
      ids.add(entry.toolData.toolCallId);
    }
  }

  return ids;
}

/**
 * Record approved tool outcomes in history before posting text or new approval cards.
 * Auto-run (non-gated) tools stay ephemeral — the model already saw them in-context.
 */
export async function emitExecutedToolResults(result: AiSdkResult, ctx: AiSdkContext): Promise<void> {
  const executed = await collectExecutedToolResults(result);
  if (executed.length === 0) {
    return;
  }

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
