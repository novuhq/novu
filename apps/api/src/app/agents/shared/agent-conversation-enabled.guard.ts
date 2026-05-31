import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum, UserSessionData } from '@novu/shared';

@Injectable()
export class AgentConversationEnabledGuard implements CanActivate {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: UserSessionData | undefined = request.user;

    if (!user?.organizationId || !user?.environmentId) {
      return true;
    }

    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
      environment: { _id: user.environmentId },
    });

    if (!isEnabled) {
      throw new NotFoundException();
    }

    return true;
  }
}
