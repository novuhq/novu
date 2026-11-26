import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag, useLaunchDarklyIdentified } from '@/hooks/use-feature-flag';

/**
 * The redesigned Integration Store is behind `IS_INTEGRATION_STORE_V_2_ENABLED`; until it is on, the same routes render
 * the previous store from `./legacy`. Delete this file, `./legacy`, the legacy page and `integration-store-routes.tsx`
 * once it is on for all.
 */
export function useIsIntegrationStoreV2Enabled() {
  return useFeatureFlag(FeatureFlagsKeysEnum.IS_INTEGRATION_STORE_V_2_ENABLED);
}

/**
 * Which store to render, or undefined until LaunchDarkly has identified the organization. Before that the flag reads
 * its anonymous value, so a page targeted by organization would show the previous store and then swap.
 */
export function useIntegrationStoreVersion(): 'v2' | 'legacy' | undefined {
  const isV2Enabled = useIsIntegrationStoreV2Enabled();
  const isIdentified = useLaunchDarklyIdentified();

  if (!isIdentified) return undefined;

  return isV2Enabled ? 'v2' : 'legacy';
}
