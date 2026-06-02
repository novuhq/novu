import type { AgentPlatformContext } from '@novu/framework';
import type { Message } from 'chat';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

interface BuildAgentPlatformContextParams {
  platformThreadId: string;
  channelId: string;
  isDM: boolean;
  platform: string;
  message?: Message | null;
  /**
   * Server-tracked Message-ID of the first message in the conversation, used as
   * the email thread root. Falls back to the current message ID when absent
   * (e.g. the first message of a brand-new thread).
   */
  firstPlatformMessageId?: string;
}

export function buildAgentPlatformContext(params: BuildAgentPlatformContextParams): AgentPlatformContext {
  const { platformThreadId, channelId, isDM, platform, message, firstPlatformMessageId } = params;
  const raw = message?.raw;

  const context: AgentPlatformContext = {
    threadId: platformThreadId,
    channelId,
    isDM,
  };

  if (raw !== undefined && raw !== null) {
    context.message = raw;
  }

  if (platform === AgentPlatformEnum.EMAIL) {
    const emailRaw =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as {
            domain?: NonNullable<AgentPlatformContext['email']>['domain'];
            route?: NonNullable<AgentPlatformContext['email']>['route'];
          })
        : {};
    const rootMessageId = firstPlatformMessageId ?? message?.id ?? undefined;

    if (emailRaw.domain !== undefined || emailRaw.route !== undefined || rootMessageId !== undefined) {
      context.email = {
        domain: emailRaw.domain,
        route: emailRaw.route,
        rootMessageId,
      };
    }
  }

  return context;
}
