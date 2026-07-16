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
import { passesAuthGate } from './auth-gate';
import { parseApprovalActionId, type ToolApprovalRequestPayload } from './tool-approval/action-id';

function findApprovalInHistory(
  history: AgentHistoryEntry[],
  approvalId: string
): ToolApprovalRequestPayload | undefined {
  for (const entry of history) {
    const tool = entry.toolData;
    if (entry.type === 'tool_approval_request' && tool?.approvalId === approvalId && tool.toolCallId) {
      return {
        approvalId: tool.approvalId,
        toolCallId: tool.toolCallId,
        name: tool.toolName ?? 'tool',
        input: tool.input,
      };
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
    // Framework-level auth gate: on a `restricted` agent, an unlinked author of a
    // new message is short-circuited with a "link your account" CTA before any
    // handler (or model call) runs. Only inbound messages are gated — approval
    // clicks/reactions ride on a prior turn the linked author already passed.
    if (options.event === AgentEventEnum.ON_MESSAGE) {
      const canProceed = await passesAuthGate(ctx, {
        subscriberAccess: options.bridge.subscriberAccess,
        auth: options.agent.handlers.auth,
      });

      if (!canProceed) {
        await ctx.flush();

        return;
      }
    }

    await runAgentHandler(options.agent, options.event, ctx);
    await ctx.flush();
  } catch (err) {
    if (err instanceof AgentDeliveryError) {
      options.logger?.error(`[agent:${options.agent.id}] ${err.message}`);
    } else {
      options.logger?.error(`[agent:${options.agent.id}] Handler error:`, err);
    }

    // A handler that throws (e.g. a LangGraph GraphRecursionError) never produces a
    // reply, which would otherwise leave the platform's "thinking" indicator running
    // forever. Best-effort clear it and flush so the turn visibly ends.
    try {
      await ctx.typing.stop();
      await ctx.flush();
    } catch {
      // The turn already failed; swallow secondary delivery errors.
    }
  }
}

async function runAgentHandler(registeredAgent: Agent, event: string, ctx: AgentContextImpl): Promise<void> {
  const replyIfPresent = async (result: MessageContent | PendingApproval | undefined) => {
    if (result instanceof PendingApproval || result === undefined) {
      return;
    }

    await ctx.reply(result);
  };

  switch (event) {
    case AgentEventEnum.ON_MESSAGE: {
      await replyIfPresent(await registeredAgent.handlers.onMessage(ctx.message!, ctx as AgentMessageContext));
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

        if (registeredAgent.userOnToolApproval === false) {
          await ctx.typing();

          if (ctx.action!.sourceMessageId) {
            await approvalMessage.delete();
          }
        }

        const result = await registeredAgent.handlers.onToolApproval(decision, ctx as AgentActionContext);
        await replyIfPresent(result);
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
