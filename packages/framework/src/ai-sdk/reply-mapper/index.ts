import type { AgentRuntimeContext } from '../../resources/agent/agent.runtime';
import type { ReplyStream, ToolApprovalConfig } from '../../resources/agent/agent.types';
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

/**
 * Every step's text as the model writes it, steps separated as paragraphs. Once the stream ends it
 * queues the executed tool results, so they are recorded before the reply that carries them.
 */
async function* streamedText(result: AiSdkStreamResult, ctx: AgentRuntimeContext): ReplyStream {
  let wroteText = false;
  let separateStep = false;

  for await (const part of result.fullStream) {
    if (part.type === 'error') {
      throw part.error;
    }
    if (part.type === 'start-step') {
      separateStep = wroteText;
    }
    if (part.type === 'text-delta' && part.text) {
      if (separateStep) {
        separateStep = false;
        yield '\n\n';
      }
      wroteText = true;
      yield part.text;
    }
  }

  await emitExecutedToolResults(result, ctx);
}

/**
 * Route an AI SDK result: a `streamText` result is replied as it streams, then the approval card
 * follows if a tool is gated. A `generateText` result posts the card if gated, else its text.
 */
export async function handleAiSdkResult(
  result: AiSdkResult,
  ctx: AgentRuntimeContext,
  config: ToolApprovalConfig | undefined
): Promise<void> {
  if (isStreamResult(result)) {
    await ctx.reply(streamedText(result, ctx));
    await postFirstApprovalCard(result, ctx, config);

    return;
  }

  // save executed tool results to Novu history
  await emitExecutedToolResults(result, ctx);

  if (!(await postFirstApprovalCard(result, ctx, config))) {
    await deliverText(result, ctx);
  }
}

/** One card at a time — multi-tool turns surface sequentially. */
async function postFirstApprovalCard(
  result: AiSdkResult,
  ctx: AgentRuntimeContext,
  config: ToolApprovalConfig | undefined
): Promise<boolean> {
  const [request] = await collectApprovalRequests(result);
  if (!request) {
    return false;
  }

  const toolCall = {
    id: request.toolCall.toolCallId,
    name: request.toolCall.toolName,
    input: request.toolCall.input,
  };
  await postToolApprovalCard(ctx, toolCall, config, request.approvalId);

  return true;
}

async function deliverText(result: AiSdkGenerateResult, ctx: AgentRuntimeContext): Promise<void> {
  const text = result.text.trim();

  if (!text) {
    await ctx.typing.stop();

    return;
  }

  await ctx.reply(text);
}
