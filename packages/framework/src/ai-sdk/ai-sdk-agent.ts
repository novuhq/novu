import { agent as frameworkAgent } from '../resources/agent/agent.resource';
import type { Agent } from '../resources/agent/agent.types';
import { deliverResult, isAiSdkResult } from './reply-mapper';
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

  return frameworkAgent(id, {
    onMessage: async (message, ctx) => {
      const result = await h.onMessage(message, ctx);

      if (isAiSdkResult(result)) {
        await deliverResult(result, ctx);

        return;
      }

      return result;
    },
    ...(h.onAction && { onAction: h.onAction }),
    ...(h.onReaction && { onReaction: h.onReaction }),
    ...(h.onResolve && { onResolve: h.onResolve }),
  });
}
