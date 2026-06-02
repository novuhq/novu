import type { AgentPlatformContext } from '@novu/framework';
import type { Message } from 'chat';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

interface BuildAgentPlatformContextParams {
  platformThreadId: string;
  channelId: string;
  isDM: boolean;
  platform: string;
  message?: Message | null;
}

export function buildAgentPlatformContext(params: BuildAgentPlatformContextParams): AgentPlatformContext {
  const { platformThreadId, channelId, isDM, platform, message } = params;
  const raw = message?.raw;

  const context: AgentPlatformContext = {
    threadId: platformThreadId,
    channelId,
    isDM,
  };

  if (raw !== undefined && raw !== null) {
    context.message = raw;
  }

  if (platform === AgentPlatformEnum.EMAIL && raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const emailRaw = raw as {
      domain?: NonNullable<AgentPlatformContext['email']>['domain'];
      route?: NonNullable<AgentPlatformContext['email']>['route'];
    };

    if (emailRaw.domain !== undefined || emailRaw.route !== undefined) {
      context.email = {
        domain: emailRaw.domain,
        route: emailRaw.route,
      };
    }
  }

  return context;
}
