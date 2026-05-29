import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';

@Injectable()
export class ApiKeysV2EnabledGuard implements CanActivate {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const organizationId = request.user?.organizationId ?? 'system';

    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_API_KEYS_V2_ENABLED,
      defaultValue: process.env.IS_API_KEYS_V2_ENABLED === 'true',
      organization: { _id: organizationId },
      environment: { _id: request.user?.environmentId || 'system' },
      component: 'api',
    });

    if (!isEnabled) {
      throw new ForbiddenException('API Keys v2 is not enabled for this organization');
    }

    return true;
  }
}
