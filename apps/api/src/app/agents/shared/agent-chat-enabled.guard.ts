import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';

import type { SubscriberSession } from '../../shared/framework/user.decorator';
import { assertAgentChatEnabled } from './assert-agent-chat-enabled';

/**
 * Gates the subscriber agent-chat API (`/v1/agent-chat/*`).
 * Requires `IS_AGENT_WEB_CHAT_ENABLED` per org/env (LaunchDarkly or env var).
 */
@Injectable()
export class AgentChatEnabledGuard implements CanActivate {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session: SubscriberSession | undefined = request.user;

    if (!session?.organizationId || !session?.environmentId) {
      throw new NotFoundException();
    }

    await assertAgentChatEnabled(this.featureFlagsService, session.organizationId, session.environmentId);

    return true;
  }
}
