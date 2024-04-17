import { FeatureFlagsKeysEnum } from '@novu/shared';
import { IS_DOCKER_HOSTED, useFeatureFlag } from '@novu/shared-web';

export function UpgradeContainer({ varBla }: { varBla: boolean }) {
  const isEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_BILLING_REVERSE_TRIAL_ENABLED);

  if (IS_DOCKER_HOSTED) {
    return null;
  }

  if (!isEnabled) {
    return null;
  }

  try {
    const module = require('@novu/ee-billing-web');
    const Component = module.UpgradeContainer;

    return <Component varBla={varBla} />;
  } catch (e) {}

  return null;
}
