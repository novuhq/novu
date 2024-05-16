import { FeatureFlagsKeysEnum } from '@novu/shared';
import { IS_DOCKER_HOSTED, useFeatureFlag } from '@novu/shared-web';

export function UpgradePlanBanner({ FeatureActivatedBanner }: { FeatureActivatedBanner: React.ReactNode }) {
  const isEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_BILLING_REVERSE_TRIAL_ENABLED);

  if (IS_DOCKER_HOSTED) {
    return null;
  }

  if (!isEnabled) {
    return null;
  }

  try {
    const module = require('@novu/ee-billing-web');
    const Component = module.UpgradePlanBanner;

    return <Component FeatureActivatedBanner={FeatureActivatedBanner} />;
  } catch (e) {}

  return null;
}
