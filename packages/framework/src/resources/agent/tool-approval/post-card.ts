import type { AgentRuntimeContext } from '../agent.runtime';
import type { AgentToolCall, ToolApprovalCard, ToolApprovalConfig, ToolApprovalRequestOptions } from '../agent.types';
import { isToolApprovalCard } from '../guards';
import { buildApprovalActionId, type ToolApprovalRequestPayload } from './action-id';

export async function postToolApprovalCard(
  ctx: AgentRuntimeContext,
  toolCall: AgentToolCall,
  config: ToolApprovalConfig | undefined,
  approvalId?: string,
  opts?: ToolApprovalRequestOptions
): Promise<void> {
  const id = approvalId ?? toolCall.id;
  const actionIds = {
    approve: buildApprovalActionId('approve', id),
    deny: buildApprovalActionId('deny', id),
  };
  const approvalCard = (overrides?: Omit<ToolApprovalCard, 'type'>): ToolApprovalCard => ({
    type: 'tool-approval-card',
    ...overrides,
  });

  const rendered = config?.renderApproval?.({ toolCall, actionIds, approvalCard }) ?? approvalCard();

  const payload: ToolApprovalRequestPayload = {
    approvalId: id,
    toolCallId: toolCall.id,
    name: toolCall.name,
    input: toolCall.input,
    ...(opts?.to !== undefined ? { to: opts.to } : {}),
    ...(opts?.from ? { from: opts.from } : {}),
    ...(opts?.ttlSeconds !== undefined ? { ttlSeconds: opts.ttlSeconds } : {}),
  };

  ctx.emitToolApprovalRequest(payload);

  if (isToolApprovalCard(rendered)) {
    await ctx.replyApprovalCard(rendered);

    return;
  }

  await ctx.reply(rendered);
}
