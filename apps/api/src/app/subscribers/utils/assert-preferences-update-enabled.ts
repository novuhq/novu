import { ServiceUnavailableException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';

export async function assertPreferencesUpdateEnabled(
  featureFlagsService: FeatureFlagsService,
  organizationId: string,
  environmentId: string
): Promise<void> {
  const isPreferencesDisabled = await featureFlagsService.getFlag({
    key: FeatureFlagsKeysEnum.IS_ORG_KILLSWITCH_FLAG_ENABLED,
    defaultValue: false,
    organization: { _id: organizationId },
    environment: { _id: environmentId },
    component: 'preferences',
  });

  if (isPreferencesDisabled) {
    throw new ServiceUnavailableException('Service temporarily unavailable for this organization');
  }
}
