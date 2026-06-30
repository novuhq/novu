import { agent as frameworkAgent } from '../resources/agent/agent.resource';
import type { Agent, AgentMessage, AgentMessageContext } from '../resources/agent/agent.types';
import { handleResult, isAiSdkResult } from './reply-mapper';
import type { AiSdkAgentHandlers } from './types';

type AiSdkMessageHandler = AiSdkAgentHandlers['onMessage'];

function normalize(id: string, handlers: AiSdkMessageHandler | AiSdkAgentHandlers): AiSdkAgentHandlers {
  const normalized = typeof handlers === 'function' ? { onMessage: handlers } : handlers;
  if (typeof normalized.onMessage !== 'function') {
    throw new Error(`agent('${id}') requires an onMessage handler`);
  }

  return normalized;
}

export function agent(id: string, handlers: AiSdkMessageHandler | AiSdkAgentHandlers): Agent {
  const h = normalize(id, handlers);
  const config = h.toolApproval;

  // The decision is persisted to `ctx.history` by Novu before this turn fires, so
  // resuming is just re-running `onMessage`: `toModelMessages(ctx.history)` now
  // yields the tool-approval-response and `streamText` continues the tool loop.
  const resume = async (ctx: AgentMessageContext): Promise<void> => {
    const result = await h.onMessage({ text: '' } as AgentMessage, ctx);
    if (isAiSdkResult(result)) {
      await handleResult(result, ctx, config);
    }
  };

  return frameworkAgent(id, {
    onMessage: async (message, ctx) => {
      const result = await h.onMessage(message, ctx);
      if (isAiSdkResult(result)) {
        await handleResult(result, ctx, config);

        return;
      }

      return result;
    },
    onToolApproval: async (decision, ctx) => {
      if (h.onToolApproval) {
        const result = await h.onToolApproval(decision, ctx);
        if (isAiSdkResult(result)) {
          await handleResult(result, ctx, config);

          return;
        }
      }

      await resume(ctx as unknown as AgentMessageContext);
    },
    ...(config && { toolApproval: config }),
    ...(h.onAction && { onAction: h.onAction }),
    ...(h.onReaction && { onReaction: h.onReaction }),
    ...(h.onResolve && { onResolve: h.onResolve }),
  });
}
