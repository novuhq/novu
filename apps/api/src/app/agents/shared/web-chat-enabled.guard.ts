import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import type { SubscriberSession } from '../../shared/framework/user.decorator';

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

    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AGENT_WEB_CHAT_ENABLED,
      defaultValue: false,
      organization: { _id: session.organizationId },
      environment: { _id: session.environmentId },
    });

    if (!isEnabled) {
      throw new NotFoundException();
    }

    return true;
  }
}
