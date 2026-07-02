import type {
  AgentContextBase,
  FileRef,
  MessageContent,
  ReplyHandle,
  ToolApprovalConfig,
  ToolResult,
} from '../../resources/agent/agent.types';
import { type ApprovalPayload, buildApprovalActionId } from '../../resources/agent/tool-approval/action-id';
import { defaultApprovalCard } from '../../resources/agent/tool-approval/approval-card';
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

interface AiSdkContext extends AgentContextBase {
  reply(content: MessageContent, options?: { files?: FileRef[]; toolApproval?: ApprovalPayload }): Promise<ReplyHandle>;
  emitToolResult(result: ToolResult): void;
}

function isCardElement(value: object): boolean {
  return 'type' in value && (value as { type: string }).type === 'card';
}

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

async function postApprovalCard(
  request: ToolApprovalRequestPart,
  ctx: AiSdkContext,
  config: ToolApprovalConfig | undefined
): Promise<void> {
  const toolCall = { id: request.toolCall.toolCallId, name: request.toolCall.toolName, input: request.toolCall.input };
  const actionIds = {
    approve: buildApprovalActionId('approve', request.approvalId),
    deny: buildApprovalActionId('deny', request.approvalId),
  };
  const content = config?.renderApproval?.({ toolCall, actionIds }) ?? defaultApprovalCard({ toolCall, actionIds });
  const payload: ApprovalPayload = {
    approvalId: request.approvalId,
    toolCallId: request.toolCall.toolCallId,
    name: request.toolCall.toolName,
    input: request.toolCall.input,
  };

  await ctx.reply(content, { toolApproval: payload });
}

/** Route an AI SDK result: pause (post approval card) if gated, else deliver the text. */
export async function handleResult(
  result: AiSdkResult,
  ctx: AgentContextBase,
  config: ToolApprovalConfig | undefined
): Promise<void> {
  const internal = ctx as unknown as AiSdkContext;

  await awaitAiSdkRun(result);
  await emitExecutedToolResults(result, internal);

  const requests = await collectApprovalRequests(result);
  if (requests.length > 0) {
    // One card at a time — multi-tool turns surface sequentially.
    await postApprovalCard(requests[0], internal, config);

    return;
  }

  await deliverResult(result, ctx);
}

export async function deliverResult(result: AiSdkResult, ctx: AgentContextBase): Promise<void> {
  const text = (await result.text).trim();

  if (!text) {
    await ctx.typing.stop();

    return;
  }

  await ctx.reply(text);
}
