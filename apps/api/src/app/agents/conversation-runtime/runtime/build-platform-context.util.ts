import type { NovuEmailRawMessage } from '@novu/chat-adapter-email';
import type { AgentPlatformContext } from '@novu/framework';
import type { Message } from 'chat';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

interface BuildAgentPlatformContextParams {
  platformThreadId: string;
  channelId: string;
  isDM: boolean;
  message?: Message | null;
  /** Resolved email-specific context (see `buildEmailPlatformContext`). */
  email?: AgentPlatformContext['email'];
}

export function buildAgentPlatformContext(params: BuildAgentPlatformContextParams): AgentPlatformContext {
  const context: AgentPlatformContext = {
    threadId: params.platformThreadId,
    channelId: params.channelId,
    isDM: params.isDM,
  };

  const raw = params.message?.raw;
  if (raw !== undefined && raw !== null) {
    context.message = raw;
  }

  if (params.email) {
    context.email = params.email;
  }

  return context;
}

/**
 * Resolved email-specific context for `platformContext.email`. Domain and route
 * are extracted from the chat-adapter-email raw payload; `rootMessageId` is the
 * server-tracked first platform message id for this conversation.
 *
 * Returns `undefined` for non-email platforms or when no resolved data exists.
 */
export function buildEmailPlatformContext(params: {
  platform: string;
  message?: Message | null;
  firstPlatformMessageId?: string;
}): AgentPlatformContext['email'] | undefined {
  if (params.platform !== AgentPlatformEnum.EMAIL) {
    return undefined;
  }

  const raw = params.message?.raw as NovuEmailRawMessage | undefined;
  const domain = raw?.domain;
  const route = raw?.route;
  const rootMessageId = params.firstPlatformMessageId;

  if (!domain && !route && !rootMessageId) {
    return undefined;
  }

  return { domain, route, rootMessageId };
}
