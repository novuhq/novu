import { InvalidActionError } from '../../errors/handler.errors';
import { AgentContextImpl } from './agent.context';
import { AgentDeliveryError } from './agent.errors';
import type {
  Agent,
  AgentActionContext,
  AgentBridgeRequest,
  AgentHistoryEntry,
  AgentMessageContext,
  AgentReactionContext,
  AgentResolveContext,
  AgentToolCall,
  MessageContent,
  ToolApprovalDecision,
} from './agent.types';
import { AgentEventEnum, PendingApproval } from './agent.types';
import { type ApprovalPayload, parseApprovalActionId } from './tool-approval/action-id';
import { resolvedApprovalCard } from './tool-approval/approval-card';

function findApprovalInHistory(history: AgentHistoryEntry[], approvalId: string): ApprovalPayload | undefined {
  for (const entry of history) {
    const payload = (entry.richContent as { toolApproval?: ApprovalPayload } | undefined)?.toolApproval;
    if (payload?.approvalId === approvalId) {
      return payload;
    }
  }

  return undefined;
}

export interface DispatchAgentEventOptions {
  agent: Agent;
  event: string;
  bridge: AgentBridgeRequest;
  secretKey: string;
  logger?: { error: (...args: unknown[]) => void };
}

export async function dispatchAgentEvent(options: DispatchAgentEventOptions): Promise<void> {
  const ctx = new AgentContextImpl(options.bridge, options.secretKey, options.agent.handlers.toolApproval);

  try {
    await runAgentHandler(options.agent, options.event, ctx);
    await ctx.flush();
    await ctx.finalizePlan('finished');
  } catch (err) {
    try {
      await ctx.finalizePlan('failed');
    } catch (finalizeErr) {
      options.logger?.error(`[agent:${options.agent.id}] plan finalize failed:`, finalizeErr);
    }
    if (err instanceof AgentDeliveryError) {
      options.logger?.error(`[agent:${options.agent.id}] ${err.message}`);
    } else {
      options.logger?.error(`[agent:${options.agent.id}] Handler error:`, err);
    }
  }
}

async function runAgentHandler(registeredAgent: Agent, event: string, ctx: AgentContextImpl): Promise<void> {
  const replyIfPresent = async (result: MessageContent | void) => {
    if (result != null) {
      await ctx.reply(result);
    }
  };

  switch (event) {
    case AgentEventEnum.ON_MESSAGE: {
      const result = await registeredAgent.handlers.onMessage(ctx.message!, ctx as AgentMessageContext);
      if (!(result instanceof PendingApproval)) {
        await replyIfPresent(result);
      }
      break;
    }
    case AgentEventEnum.ON_ACTION: {
      const parsed = parseApprovalActionId(ctx.action?.id);

      if (parsed && registeredAgent.handlers.onToolApproval) {
        const { approved, approvalId } = parsed;
        const approval = findApprovalInHistory(ctx.history, approvalId);
        const toolCall: AgentToolCall = approval
          ? { id: approval.toolCallId, name: approval.name, input: approval.input }
          : { id: approvalId, name: '' };
        const approvalMessage = ctx.createReplyHandle(ctx.action!.sourceMessageId ?? '');

        const decision: ToolApprovalDecision = { toolCall, approved, approvalMessage };
        const result = await registeredAgent.handlers.onToolApproval(decision, ctx as AgentActionContext);
        await replyIfPresent(result);

        if (!approvalMessage.editedByHandler && ctx.action!.sourceMessageId) {
          await approvalMessage.edit(resolvedApprovalCard({ name: toolCall.name, approved }));
        }
        break;
      }

      if (registeredAgent.handlers.onAction) {
        await replyIfPresent(await registeredAgent.handlers.onAction(ctx.action!, ctx as AgentActionContext));
      }
      break;
    }
    case AgentEventEnum.ON_REACTION:
      if (registeredAgent.handlers.onReaction) {
        await replyIfPresent(await registeredAgent.handlers.onReaction(ctx.reaction!, ctx as AgentReactionContext));
      }
      break;
    case AgentEventEnum.ON_RESOLVE:
      if (registeredAgent.handlers.onResolve) {
        await replyIfPresent(await registeredAgent.handlers.onResolve(ctx as AgentResolveContext));
      }
      break;
    default:
      throw new InvalidActionError(event, AgentEventEnum);
  }
}
