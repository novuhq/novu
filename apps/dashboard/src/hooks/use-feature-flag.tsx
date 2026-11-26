import { FeatureFlagsKeysEnum, parseFeatureFlagOverrides, prepareBooleanStringFeatureFlag } from '@novu/shared';
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
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

const runtimeEnv = (window as Window & { _env_?: Record<string, string> })._env_;

// Flags forced to a value whatever LaunchDarkly serves; a Novu Box forces one on for itself only.
const overrides = parseFeatureFlagOverrides(runtimeEnv?.VITE_FEATURE_FLAG_OVERRIDES);
const isForced = (key: FeatureFlagsKeysEnum) => key in overrides;

function getFeatureFlagEnvValue(key: FeatureFlagsKeysEnum): string | undefined {
  return (
    // Check runtime env first (for self-hosted flexibility)
    runtimeEnv?.[`VITE_${key}`] ??
    // Check if the feature flag is exported as an environment variable
    import.meta.env[`VITE_${key}`] ??
    // Then check process.env if process exists
    (typeof process !== 'undefined' ? process?.env?.[key] : undefined)
  );
}

export const useFeatureFlag = (key: FeatureFlagsKeysEnum, defaultValue = false): boolean => {
  const flags = useFlags();

  if (isForced(key)) {
    return overrides[key] === true;
  }

  if (!isLaunchDarklyEnabled()) {
    return prepareBooleanStringFeatureFlag(getFeatureFlagEnvValue(key), defaultValue);
  }

  return flags[key] ?? defaultValue;
};

/**
 * A JSON flag read through `parse`, which gets the value LaunchDarkly serves (e.g. an array) or, without LaunchDarkly,
 * the raw `VITE_<KEY>` string. Pass a module-level `parse`, so the parsed value only changes with the flag.
 */
export const useParsedFeatureFlag = <T,>(key: FeatureFlagsKeysEnum, parse: (value: unknown) => T): T => {
  const flags = useFlags();
  const value = isForced(key) ? overrides[key] : isLaunchDarklyEnabled() ? flags[key] : getFeatureFlagEnvValue(key);

  return useMemo(() => parse(value), [parse, value]);
};

export const useNumericFeatureFlag = (key: FeatureFlagsKeysEnum, defaultValue = 0): number => {
  const flags = useFlags();

  if (isForced(key)) {
    return typeof overrides[key] === 'number' ? overrides[key] : defaultValue;
  }

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
