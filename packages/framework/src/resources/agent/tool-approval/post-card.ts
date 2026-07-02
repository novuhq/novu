import type { AgentRuntimeContext } from '../agent.runtime';
import type { AgentToolCall, ToolApprovalConfig } from '../agent.types';
import { type ApprovalPayload, buildApprovalActionId } from './action-id';
import { defaultApprovalCard } from './approval-card';

export async function postToolApprovalCard(
  ctx: AgentRuntimeContext,
  toolCall: AgentToolCall,
  config: ToolApprovalConfig | undefined,
  approvalId?: string
): Promise<void> {
  const id = approvalId ?? toolCall.id;
  const actionIds = {
    approve: buildApprovalActionId('approve', id),
    deny: buildApprovalActionId('deny', id),
  };
  const content = config?.renderApproval?.({ toolCall, actionIds }) ?? defaultApprovalCard({ toolCall, actionIds });
  const payload: ApprovalPayload = {
    approvalId: id,
    toolCallId: toolCall.id,
    name: toolCall.name,
    input: toolCall.input,
  };

  await ctx.reply(content, { toolApproval: payload });
}
