import { useFlags } from 'launchdarkly-react-client-sdk';
import { FeatureFlagsKeysEnum, prepareBooleanStringFeatureFlag } from '@novu/shared';
import { LAUNCH_DARKLY_CLIENT_SIDE_ID } from '../config';

function isLaunchDarklyEnabled() {
  return !!LAUNCH_DARKLY_CLIENT_SIDE_ID;
}

export const useFeatureFlag = (key: FeatureFlagsKeysEnum, defaultValue = false): boolean => {
  const flags = useFlags();

  if (!isLaunchDarklyEnabled()) {
    return prepareBooleanStringFeatureFlag(window._env_[key] || process.env[key], defaultValue);
  }

  return flags[key] ?? defaultValue;
};
