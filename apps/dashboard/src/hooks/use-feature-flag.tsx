import { FeatureFlagsKeysEnum, prepareBooleanStringFeatureFlag } from '@novu/shared';
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';
import { useEffect, useState } from 'react';
import { IS_SELF_HOSTED_EE, LAUNCH_DARKLY_CLIENT_SIDE_ID } from '../config';
import { agentRedirectDebugLog } from '@/utils/agent-redirect-debug';

function isLaunchDarklyEnabled() {
  if (!!LAUNCH_DARKLY_CLIENT_SIDE_ID && IS_SELF_HOSTED_EE) {
    return true;
  }

  return !!LAUNCH_DARKLY_CLIENT_SIDE_ID && !IS_SELF_HOSTED_EE;
}

/** True once LaunchDarkly has finished its first load (or when LD is not configured). */
export function useLaunchDarklyReady(): boolean {
  const ldClient = useLDClient();
  const [isReady, setIsReady] = useState(!isLaunchDarklyEnabled() || !ldClient);

  useEffect(() => {
    if (!isLaunchDarklyEnabled()) {
      setIsReady(true);

      return;
    }

    if (!ldClient) {
      setIsReady(false);

      return;
    }

    let cancelled = false;

    const waitForReady = async () => {
      try {
        await ldClient.waitUntilReady?.();
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    };

    void waitForReady();

    return () => {
      cancelled = true;
    };
  }, [ldClient]);

  return isReady;
}

export const useFeatureFlag = (key: FeatureFlagsKeysEnum, defaultValue = false): boolean => {
  const flags = useFlags();

  if (!isLaunchDarklyEnabled()) {
    const windowEnvValue = (window as unknown as { _env_?: Record<string, string> })?._env_?.[`VITE_${key}`];
    const importMetaValue = import.meta.env[`VITE_${key}`];
    const processValue = typeof process !== 'undefined' ? process?.env?.[key] : undefined;
    const envValue =
      // Check runtime env first (for self-hosted flexibility)
      windowEnvValue ??
      // Check if the feature flag is exported as an environment variable
      importMetaValue ??
      // Then check process.env if process exists
      processValue;

    const resolved = prepareBooleanStringFeatureFlag(envValue, defaultValue);

    // #region agent log
    if (key === FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED) {
      agentRedirectDebugLog({
        hypothesisId: 'E',
        location: 'use-feature-flag.tsx:env-path',
        message: 'useFeatureFlag agents (LD disabled)',
        data: {
          key,
          defaultValue,
          windowEnvValue: windowEnvValue ?? null,
          importMetaValue: importMetaValue ?? null,
          processValue: processValue ?? null,
          envValue: envValue ?? null,
          resolved,
          ldEnabled: false,
        },
      });
    }
    // #endregion

    return resolved;
  }

  const ldResolved = flags[key] ?? defaultValue;

  // #region agent log
  if (key === FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED) {
    agentRedirectDebugLog({
      hypothesisId: 'E',
      location: 'use-feature-flag.tsx:ld-path',
      message: 'useFeatureFlag agents (LD enabled)',
      data: {
        key,
        defaultValue,
        flagFromLd: flags[key] ?? null,
        ldResolved,
        ldEnabled: true,
      },
    });
  }
  // #endregion

  return ldResolved;
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
