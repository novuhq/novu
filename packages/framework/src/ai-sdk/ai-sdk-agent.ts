import { agent as frameworkAgent } from '../resources/agent/agent.resource';
import { requireRuntimeContext } from '../resources/agent/agent.runtime';
import type { Agent, AgentActionContext, AgentMessage, ReplyHandle } from '../resources/agent/agent.types';
import { handleAiSdkResult, isAiSdkResult } from './reply-mapper';
import type { AiSdkAgentHandlers } from './types';

type AiSdkMessageHandler = AiSdkAgentHandlers['onMessage'];

/** Synthetic message for approval resume — handlers rely on `ctx.history`, not this payload. */
const RESUME_MESSAGE: AgentMessage = {
  text: '',
  platformMessageId: '',
  author: { userId: '', fullName: '', userName: '', isBot: false },
  timestamp: '',
};

function isReplyHandle(value: unknown): value is ReplyHandle {
  return typeof value === 'object' && value !== null && 'messageId' in value && 'platformThreadId' in value;
}

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
  const resume = async (ctx: AgentActionContext): Promise<void> => {
    const runtime = requireRuntimeContext(ctx);
    const result = await h.onMessage(RESUME_MESSAGE, runtime.asMessageContext());
    if (isAiSdkResult(result)) {
      await handleAiSdkResult(result, runtime, config);
    }
  };

  return frameworkAgent(id, {
    onMessage: async (message, ctx) => {
      const result = await h.onMessage(message, ctx);

      if (isAiSdkResult(result)) {
        await handleAiSdkResult(result, requireRuntimeContext(ctx), config);

        return;
      }

      return result;
    },
    onToolApproval: async (decision, ctx) => {
      const runtime = requireRuntimeContext(ctx);
      if (h.onToolApproval) {
        const result = await h.onToolApproval(decision, ctx);
        if (isAiSdkResult(result)) {
          await handleAiSdkResult(result, runtime, config);

          return;
        }

        if (result != null && !isReplyHandle(result)) {
          await runtime.reply(result);
        }
      }

      await resume(ctx);
    },
    ...(config && { toolApproval: config }),
    ...(h.onAction && { onAction: h.onAction }),
    ...(h.onReaction && { onReaction: h.onReaction }),
    ...(h.onResolve && { onResolve: h.onResolve }),
  });
}
