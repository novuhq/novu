import { useFlags } from 'launchdarkly-react-client-sdk';
import { FeatureFlagsKeysEnum, prepareBooleanStringFeatureFlag } from '@novu/shared';
import { FEATURE_FLAGS as FLAGS_IN_WINDOW_OR_ENV, LAUNCH_DARKLY_CLIENT_SIDE_ID } from '../config';

function isLaunchDarklyEnabled() {
  return !!LAUNCH_DARKLY_CLIENT_SIDE_ID;
}

export const useFeatureFlag = (key: FeatureFlagsKeysEnum): boolean => {
  const flags = useFlags();

  if (!isLaunchDarklyEnabled()) {
    return prepareBooleanStringFeatureFlag(FLAGS_IN_WINDOW_OR_ENV[key], false);
  }

  return flags[key] ?? false;
};
