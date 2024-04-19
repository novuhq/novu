import { FeatureFlagsKeysEnum } from '@novu/shared';
import { IS_DOCKER_HOSTED, useFeatureFlag } from '@novu/shared-web';

export const FreeTrialSidebarWidget = () => {
  const isEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_BILLING_REVERSE_TRIAL_ENABLED);

  if (IS_DOCKER_HOSTED) {
    return null;
  }

  if (!isEnabled) {
    return null;
  }

  try {
    const module = require('@novu/ee-billing-web');
    const Component = module.FreeTrialSidebarWidget;

    return <Component />;
  } catch (e) {}

  return null;
};
