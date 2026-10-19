import { ServiceUnavailableException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';

export async function assertGetPreferencesEnabled(
  featureFlagsService: FeatureFlagsService,
  organizationId: string,
  environmentId: string
): Promise<void> {
  const isGetPreferencesDisabled = await featureFlagsService.getFlag({
    key: FeatureFlagsKeysEnum.IS_GET_PREFERENCES_DISABLED,
    defaultValue: false,
    organization: { _id: organizationId },
    environment: { _id: environmentId },
  });

  if (isGetPreferencesDisabled) {
    throw new ServiceUnavailableException('Get preferences service is currently unavailable');
  }
}
