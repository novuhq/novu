import { FeatureFlagsKeysEnum, prepareBooleanStringFeatureFlag } from '@novu/shared';
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAuth } from '@/context/auth/hooks';
import { IS_SELF_HOSTED_EE, LAUNCH_DARKLY_CLIENT_SIDE_ID } from '../config';

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

let identifiedOrganizationId: string | undefined;
const identifyListeners = new Set<() => void>();

let latestIdentifyRequest = 0;

/**
 * Call right before `ldClient.identify()` for this organization; the returned callback records that the call settled
 * (resolved or rejected). Only the latest call may record, so a slow earlier identify cannot overwrite a newer one.
 */
export function beginLaunchDarklyIdentify(organizationId: string): () => void {
  latestIdentifyRequest += 1;
  const request = latestIdentifyRequest;

  return () => {
    if (request !== latestIdentifyRequest || identifiedOrganizationId === organizationId) return;

    identifiedOrganizationId = organizationId;

    for (const listener of identifyListeners) listener();
  };
}

function subscribeToIdentified(listener: () => void) {
  identifyListeners.add(listener);

  return () => identifyListeners.delete(listener);
}

/**
 * True when LaunchDarkly is not configured, or once `identify()` has settled for the current organization, so flags
 * targeted by organization are evaluated for it. `useLaunchDarklyReady` only covers the initial anonymous context.
 */
export function useLaunchDarklyIdentified(): boolean {
  const { currentOrganization } = useAuth();
  const identifiedId = useSyncExternalStore(subscribeToIdentified, () => identifiedOrganizationId);

  if (!isLaunchDarklyEnabled()) {
    return true;
  }

  return !!currentOrganization && identifiedId === currentOrganization._id;
}

export const useFeatureFlag = (key: FeatureFlagsKeysEnum, defaultValue = false): boolean => {
  const flags = useFlags();

  if (!isLaunchDarklyEnabled()) {
    const envValue =
      // Check runtime env first (for self-hosted flexibility)
      (window as Window & { _env_?: Record<string, string> })._env_?.[`VITE_${key}`] ??
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
