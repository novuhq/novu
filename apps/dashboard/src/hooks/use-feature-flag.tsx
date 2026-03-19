import { FeatureFlags, FeatureFlagsKeysEnum, prepareBooleanStringFeatureFlag } from '@novu/shared';
import { useFlags } from 'launchdarkly-react-client-sdk';
import { IS_ENTERPRISE, IS_SELF_HOSTED, LAUNCH_DARKLY_CLIENT_SIDE_ID } from '../config';

function isLaunchDarklyEnabled() {
  if (!!LAUNCH_DARKLY_CLIENT_SIDE_ID && IS_ENTERPRISE) {
    return true;
  }

  return !!LAUNCH_DARKLY_CLIENT_SIDE_ID && !(IS_SELF_HOSTED && IS_ENTERPRISE);
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
      // Check runtime env first (for self-hosted flexibility)
      (window as unknown as { _env_?: Record<string, string> })?._env_?.[`VITE_${key}`] ??
      // Check if the feature flag is exported as an environment variable
      import.meta.env[`VITE_${key}`] ??
      // Then check process.env if process exists
      (typeof process !== 'undefined' ? process?.env?.[key] : undefined);

    return prepareBooleanStringFeatureFlag(envValue, defaultValue);
  }

  return flags[key] ?? defaultValue;
};

export const useNumericFeatureFlag = (key: FeatureFlagsKeysEnum, defaultValue = 0): number => {
  const flags = useFlags();

  if (!isLaunchDarklyEnabled()) {
    const envValue =
      // Check if the feature flag is exported as an environment variable
      import.meta.env[`VITE_${key}`] ??
      // Then check process.env if process exists
      (typeof process !== 'undefined' ? process?.env?.[key] : undefined);

    const numericValue = envValue ? parseInt(envValue, 10) : defaultValue;
    return Number.isNaN(numericValue) ? defaultValue : numericValue;
  }

  const flagValue = flags[key];
  return typeof flagValue === 'number' ? flagValue : defaultValue;
};
