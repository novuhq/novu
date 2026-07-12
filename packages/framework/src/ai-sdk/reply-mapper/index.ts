import type { AgentRuntimeContext } from '../../resources/agent/agent.runtime';
import type { ToolApprovalConfig } from '../../resources/agent/agent.types';
import { isCardElement } from '../../resources/agent/guards';
import { postToolApprovalCard } from '../../resources/agent/tool-approval/post-card';
import type { AiSdkApprovalRequestPart, AiSdkGenerateResult, AiSdkResult, AiSdkStreamResult } from '../types';
import { emitExecutedToolResults } from './collect-results';

export function isStreamResult(value: unknown): value is AiSdkStreamResult {
  return (
    typeof value === 'object' && value !== null && typeof (value as AiSdkStreamResult).consumeStream === 'function'
  );
}

export function isGenerateResult(value: unknown): value is AiSdkGenerateResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'text' in value &&
    'steps' in value &&
    'usage' in value &&
    !isStreamResult(value)
  );
}

export function isAiSdkResult(value: unknown): value is AiSdkResult {
  if (typeof value !== 'object' || value === null || isCardElement(value)) {
    return false;
  }

  return isStreamResult(value) || isGenerateResult(value);
}

/** Manual approval only — skip `isAutomatic` parts the SDK already resolved in the same turn. */
function isManualToolApprovalRequestPart(part: unknown): part is AiSdkApprovalRequestPart {
  if (typeof part !== 'object' || part === null || (part as { type?: string }).type !== 'tool-approval-request') {
    return false;
  }

  const request = part as AiSdkApprovalRequestPart & { isAutomatic?: boolean };

  return !request.isAutomatic && typeof request.toolCall?.toolCallId === 'string';
}

async function collectApprovalRequests(result: AiSdkResult): Promise<AiSdkApprovalRequestPart[]> {
  const content = await Promise.resolve(result.content);
  if (!Array.isArray(content)) {
    return [];
  }

  return (content as unknown[]).filter(isManualToolApprovalRequestPart);
}

/** Route an AI SDK result: pause (post approval card) if gated, else deliver the text. */
export async function handleAiSdkResult(
  result: AiSdkResult,
  ctx: AgentRuntimeContext,
  config: ToolApprovalConfig | undefined
): Promise<void> {
  if (isStreamResult(result)) {
    await result.consumeStream();
  }

  // save executed tool results to Novu history
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
  const text = (await Promise.resolve(result.text)).trim();

  if (!text) {
    await ctx.typing.stop();

    return;
  }

  await ctx.reply(text);
}
