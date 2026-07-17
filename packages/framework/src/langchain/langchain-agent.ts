import { requireRuntimeContext } from '../resources/agent/agent.runtime';
import type {
  Agent,
  AgentActionContext,
  AgentHandlers,
  AgentMessage,
  ReplyHandle,
} from '../resources/agent/agent.types';
import { handleLangChainResult, isLangChainResult } from './reply-mapper';
import type { LangChainAgentHandlers } from './types';

type LangChainMessageHandler = LangChainAgentHandlers['onMessage'];

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

function normalize(id: string, handlers: LangChainMessageHandler | LangChainAgentHandlers): LangChainAgentHandlers {
  const normalized = typeof handlers === 'function' ? { onMessage: handlers } : handlers;
  if (typeof normalized.onMessage !== 'function') {
    throw new Error(`agent('${id}') requires an onMessage handler`);
  }

  return normalized;
}

/**
 * Wrap LangChain handlers as a Novu {@link Agent}.
 *
 * Return a {@link import('./types').LangChainAgentConfig} from `onMessage` to let Novu run the
 * agent and own the tool-approval loop; gated tools pause with an approval card and resume
 * statelessly from `ctx.history`. You may also return already-produced messages, a card, or plain
 * text. Approvals auto-resume `onMessage` unless a custom `onToolApproval` handles them.
 */
export function agent(id: string, handlers: LangChainMessageHandler | LangChainAgentHandlers): Agent {
  if (!id) {
    throw new Error('agent() requires a non-empty agentId');
  }

  const h = normalize(id, handlers);
  const config = h.toolApproval;
  const userOnToolApproval = typeof h.onToolApproval === 'function';

  // The decision is persisted to `ctx.history` before this turn fires, so resuming is just
  // re-running `onMessage`: the adapter executes the approved tool, records its result, and
  // `toLangChainMessages(ctx.history)` replays a completed cycle for the model to continue from.
  const resume = async (ctx: AgentActionContext): Promise<void> => {
    const runtime = requireRuntimeContext(ctx);
    const result = await h.onMessage(RESUME_MESSAGE, runtime.asMessageContext());
    if (isLangChainResult(result)) {
      await handleLangChainResult(result, runtime, config);
    }
  };

  const wrappedHandlers: AgentHandlers = {
    onMessage: async (message, ctx) => {
      const result = await h.onMessage(message, ctx);

      if (isLangChainResult(result)) {
        await handleLangChainResult(result, requireRuntimeContext(ctx), config);

        return;
      }

      return result;
    },
    onToolApproval: async (decision, ctx) => {
      const runtime = requireRuntimeContext(ctx);
      if (h.onToolApproval) {
        const result = await h.onToolApproval(decision, ctx);
        if (isLangChainResult(result)) {
          await handleLangChainResult(result, runtime, config);

          return;
        }

        if (result != null && !isReplyHandle(result)) {
          await runtime.reply(result);
        }
      }

      await resume(ctx);
    },
    ...(config && { toolApproval: config }),
    ...(h.auth && { auth: h.auth }),
    ...(h.onAction && { onAction: h.onAction }),
    ...(h.onReaction && { onReaction: h.onReaction }),
    ...(h.onResolve && { onResolve: h.onResolve }),
    ...(h.onError && { onError: h.onError }),
  };

  return { id, handlers: wrappedHandlers, userOnToolApproval };
}
