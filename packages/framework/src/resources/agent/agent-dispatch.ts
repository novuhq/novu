import { InvalidActionError } from '../../errors/handler.errors';
import { AgentContextImpl } from './agent.context';
import { AgentDeliveryError } from './agent.errors';
import type {
  Agent,
  AgentActionContext,
  AgentBridgeRequest,
  AgentMessageContext,
  AgentReactionContext,
  AgentResolveContext,
  MessageContent,
} from './agent.types';
import { AgentEventEnum } from './agent.types';

export interface DispatchAgentEventOptions {
  agent: Agent;
  event: string;
  bridge: AgentBridgeRequest;
  secretKey: string;
  logger?: { error: (...args: unknown[]) => void };
}

export async function dispatchAgentEvent(options: DispatchAgentEventOptions): Promise<void> {
  const ctx = new AgentContextImpl(options.bridge, options.secretKey);

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
    case AgentEventEnum.ON_MESSAGE:
      await replyIfPresent(await registeredAgent.handlers.onMessage(ctx.message!, ctx as AgentMessageContext));
      break;
    case AgentEventEnum.ON_ACTION:
      if (registeredAgent.handlers.onAction) {
        await replyIfPresent(await registeredAgent.handlers.onAction(ctx.action!, ctx as AgentActionContext));
      }
      break;
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
