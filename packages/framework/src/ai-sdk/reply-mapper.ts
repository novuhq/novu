import type { AgentContextBase, ToolApprovalConfig } from '../resources/agent/agent.types';
import { type ApprovalPayload, buildApprovalActionId } from '../resources/agent/tool-approval/action-id';
import { defaultApprovalCard } from '../resources/agent/tool-approval/approval-card';
import type { AiSdkResult } from './types';

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
  const content = await (result as { content: unknown }).content;
  if (!Array.isArray(content)) {
    return [];
  }

  return content.filter((p): p is ToolApprovalRequestPart => (p as { type?: string }).type === 'tool-approval-request');
}

async function postApprovalCard(
  request: ToolApprovalRequestPart,
  ctx: AgentContextBase,
  config: ToolApprovalConfig | undefined
): Promise<void> {
  const toolCall = { id: request.toolCall.toolCallId, name: request.toolCall.toolName, input: request.toolCall.input };
  const payload: ApprovalPayload = {
    approvalId: request.approvalId,
    toolCallId: request.toolCall.toolCallId,
    name: request.toolCall.toolName,
    input: request.toolCall.input,
  };
  const actionIds = {
    approve: buildApprovalActionId('approve', payload),
    deny: buildApprovalActionId('deny', payload),
  };
  const content = config?.renderApproval?.({ toolCall, actionIds }) ?? defaultApprovalCard({ toolCall, actionIds });

  await ctx.reply(content);
}

/** Route an AI SDK result: pause (post approval card) if gated, else deliver the text. */
export async function handleResult(
  result: AiSdkResult,
  ctx: AgentContextBase,
  config: ToolApprovalConfig | undefined
): Promise<void> {
  const requests = await collectApprovalRequests(result);
  if (requests.length > 0) {
    for (const request of requests) {
      await postApprovalCard(request, ctx, config);
    }

    return;
  }

  await deliverResult(result, ctx);
}

export async function deliverResult(result: AiSdkResult, ctx: AgentContextBase): Promise<void> {
  const text = (await result.text).trim();

  if (!text) {
    return;
  }

  await ctx.reply(text);
}
