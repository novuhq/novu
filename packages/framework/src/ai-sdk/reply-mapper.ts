import type { StepResult, ToolSet } from 'ai';
import type {
  AgentContextBase,
  FileRef,
  MessageContent,
  ReplyHandle,
  ToolApprovalConfig,
  ToolResult,
} from '../resources/agent/agent.types';
import { type ApprovalPayload, buildApprovalActionId } from '../resources/agent/tool-approval/action-id';
import { defaultApprovalCard } from '../resources/agent/tool-approval/approval-card';
import type { AiSdkResult } from './types';

/**
 * The concrete-context capabilities this adapter uses beyond the public `AgentContextBase`:
 * replying with a tool-approval payload, and recording a tool result. Cast the incoming
 * context to this once (see `handleResult`) instead of coercing at every call site.
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

interface ExecutedToolResult {
  toolCallId: string;
  toolName?: string;
  output: unknown;
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
 * Approval-resume executions are recorded in `response.messages`, not always in `steps`.
 * See AI SDK `stream-text.ts` initial `executeToolCall` after `collectToolApprovals`.
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

/** Pull the executed `tool-result`s out of a `streamText`/`generateText` result. */
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

/** Wait for a `streamText`/`generateText` run to finish before reading steps/content. */
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

/** Tool calls that were gated behind approval — the only ones whose results we record. */
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
 * Queue the outcomes of any approved tools that ran this turn so they're recorded in history.
 * Only approval-gated tools are recorded; auto-run tools stay ephemeral.
 */
async function emitExecutedToolResults(result: AiSdkResult, ctx: AiSdkContext): Promise<void> {
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
  // Single boundary cast: the incoming context is always the concrete impl, which exposes
  // the internal capabilities (`emitToolResult`, `reply` with `toolApproval`) this adapter needs.
  const internal = ctx as unknown as AiSdkContext;

  await awaitAiSdkRun(result);

  // Record executed tool outcomes before posting anything else, so history stays in
  // tool-call → tool-result → reply order.
  await emitExecutedToolResults(result, internal);

  const requests = await collectApprovalRequests(result);
  if (requests.length > 0) {
    // Surface a single gated tool at a time so cards render sequentially.
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
