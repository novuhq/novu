import { useFlags } from 'launchdarkly-react-client-sdk';
import { FeatureFlags, FeatureFlagsKeysEnum, prepareBooleanStringFeatureFlag } from '@novu/shared';
import { LAUNCH_DARKLY_CLIENT_SIDE_ID } from '../config';

function isLaunchDarklyEnabled() {
  return !!LAUNCH_DARKLY_CLIENT_SIDE_ID;
}

export const useFlagsMap = (defaultValue = false): FeatureFlags => {
  const flags = useFlags();

  return flags.reduce((acc, flag) => {
    acc[flag] = flags[flag] ?? defaultValue;

    return acc;
  }, {} as FeatureFlags);
};

export const useFeatureFlag = (key: FeatureFlagsKeysEnum, defaultValue = false): boolean => {
  const flags = useFlags();

  if (!isLaunchDarklyEnabled()) {
    return prepareBooleanStringFeatureFlag(window._env_[key] || process.env[key], defaultValue);
  }

  return flags[key] ?? defaultValue;
};
