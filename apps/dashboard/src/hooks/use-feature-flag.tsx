import { FeatureFlags, FeatureFlagsKeysEnum, prepareBooleanStringFeatureFlag } from '@novu/shared';
import { useFlags } from 'launchdarkly-react-client-sdk';
import { LAUNCH_DARKLY_CLIENT_SIDE_ID } from '../config';

function isLaunchDarklyEnabled() {
  return !!LAUNCH_DARKLY_CLIENT_SIDE_ID;
}

export const useFeatureFlagMap = (defaultValue = false): FeatureFlags => {
  const flags = useFlags();

  return Object.keys(flags).reduce((acc: FeatureFlags, flag: string) => {
    acc[flag as keyof FeatureFlags] = flags[flag] ?? defaultValue;

    return acc;
  }, {} as FeatureFlags);
};

export const useFeatureFlag = (key: FeatureFlagsKeysEnum, defaultValue = false): boolean => {
  const flags = useFlags();

  if (!isLaunchDarklyEnabled()) {
    const envValue =
      // Check if the feature flag is exported as an environment variable
      import.meta.env[`VITE_${key}`] ??
      // Then check process.env if process exists
      (typeof process !== 'undefined' ? process?.env?.[key] : undefined);

    return prepareBooleanStringFeatureFlag(envValue, defaultValue);
  }

  return flags[key] ?? defaultValue;
};
