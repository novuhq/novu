import { agent as frameworkAgent } from '../resources/agent/agent.resource';
import type { Agent, AgentMessage, ToolApprovalDecision } from '../resources/agent/agent.types';
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

  const autoResume = async (decision: ToolApprovalDecision, ctx: never): Promise<void> => {
    const context = ctx as unknown as { history: unknown[] };
    context.history.push({
      role: 'agent',
      type: 'tool-approval-response',
      content: '',
      richContent: { approvalId: decision.toolCall.id, approved: decision.approved },
      createdAt: new Date().toISOString(),
    });

    const result = await h.onMessage({ text: '' } as AgentMessage, ctx as never);
    if (isAiSdkResult(result)) {
      await handleResult(result, ctx as never, config);
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

      await autoResume(decision, ctx as never);
    },
    ...(config && { toolApproval: config }),
    ...(h.onAction && { onAction: h.onAction }),
    ...(h.onReaction && { onReaction: h.onReaction }),
    ...(h.onResolve && { onResolve: h.onResolve }),
  });
}
