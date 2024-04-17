import { FeatureFlagsKeysEnum } from '@novu/shared';
import { IS_DOCKER_HOSTED, useFeatureFlag } from '@novu/shared-web';

export function FreeTrialBanner() {
  const isEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_BILLING_REVERSE_TRIAL_ENABLED);

  if (IS_DOCKER_HOSTED) {
    return null;
  }

  if (!isEnabled) {
    return null;
  }

  try {
    const module = require('@novu/ee-billing-web');
    const Component = module.FreeTrialBanner;

    return <Component />;
  } catch (e) {}

  return null;
}
