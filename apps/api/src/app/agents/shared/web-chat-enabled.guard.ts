import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';

import type { SubscriberSession } from '../../shared/framework/user.decorator';
import { assertWebChatEnabled } from './assert-web-chat-enabled';

/**
 * Gates the subscriber web-chat API (`/v1/web-chat/*`).
 * Requires `IS_AGENT_WEB_CHAT_ENABLED` per org/env (LaunchDarkly or env var).
 */
@Injectable()
export class WebChatEnabledGuard implements CanActivate {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session: SubscriberSession | undefined = request.user;

    if (!session?.organizationId || !session?.environmentId) {
      throw new NotFoundException();
    }

    await assertWebChatEnabled(this.featureFlagsService, session.organizationId, session.environmentId);

    return true;
  }
}
