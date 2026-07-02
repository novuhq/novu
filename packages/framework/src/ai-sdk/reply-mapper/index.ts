import type { AgentRuntimeContext } from '../../resources/agent/agent.runtime';
import type { ToolApprovalConfig } from '../../resources/agent/agent.types';
import { isCardElement } from '../../resources/agent/guards';
import { postToolApprovalCard } from '../../resources/agent/tool-approval/post-card';
import type { AiSdkResult } from '../types';
import { emitExecutedToolResults } from './collect-results';

/**
 * Routes AI SDK `streamText` / `generateText` output back to Novu.
 *
 * ## Responsibilities
 * 1. **Persist gated tool results** — approved tools that ran this turn (via `./collect-results`)
 * 2. **Pause for approval** — post one approval card when the model gated a tool
 * 3. **Deliver text** — reply with final model text when the turn is complete
 *
 * Order matters: tool results are emitted before replies so ledger chronology stays consistent.
 */

export function isAiSdkResult(value: unknown): value is AiSdkResult {
  if (typeof value !== 'object' || value === null || isCardElement(value)) {
    return false;
  }

  if ('textStream' in value) {
    return 'text' in value;
  }

  return 'text' in value && 'steps' in value;
}

interface ToolApprovalRequestPart {
  type: 'tool-approval-request';
  approvalId: string;
  toolCall: { toolCallId: string; toolName: string; input?: Record<string, unknown> };
}

async function collectApprovalRequests(result: AiSdkResult): Promise<ToolApprovalRequestPart[]> {
  const content = await result.content;
  if (!Array.isArray(content)) {
    return [];
  }

  return content.filter((p): p is ToolApprovalRequestPart => (p as { type?: string }).type === 'tool-approval-request');
}

async function awaitAiSdkRun(result: AiSdkResult): Promise<void> {
  const pending: PromiseLike<unknown>[] = [];

  if (result.text != null) {
    pending.push(Promise.resolve(result.text));
  }

  if (result.content != null) {
    pending.push(Promise.resolve(result.content));
  }

  if (result.steps != null) {
    pending.push(Promise.resolve(result.steps));
  }

  if (result.response != null) {
    pending.push(Promise.resolve(result.response));
  }

  await Promise.all(pending);
}

/** Route an AI SDK result: pause (post approval card) if gated, else deliver the text. */
export async function handleResult(
  result: AiSdkResult,
  ctx: AgentRuntimeContext,
  config: ToolApprovalConfig | undefined
): Promise<void> {
  await awaitAiSdkRun(result);
  await emitExecutedToolResults(result, ctx);

  const requests = await collectApprovalRequests(result);
  if (requests.length > 0) {
    const request = requests[0];
    const toolCall = {
      id: request.toolCall.toolCallId,
      name: request.toolCall.toolName,
      input: request.toolCall.input,
    };

    // One card at a time — multi-tool turns surface sequentially.
    await postToolApprovalCard(ctx, toolCall, config, request.approvalId);

    return;
  }

  await deliverResult(result, ctx);
}

export async function deliverResult(result: AiSdkResult, ctx: AgentRuntimeContext): Promise<void> {
  const text = (await result.text).trim();

  if (!text) {
    await ctx.typing.stop();

    return;
  }

  await ctx.reply(text);
}
