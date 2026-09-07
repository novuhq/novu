import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { useEffect, useState } from 'react';
import { IS_EU } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';

function useLaunchDarklyReady() {
  const ldClient = useLDClient();
  const [isReady, setIsReady] = useState(!ldClient);

  useEffect(() => {
    if (!ldClient) {
      setIsReady(true);

      return;
    }

    const waitForReady = async () => {
      try {
        await ldClient.waitUntilReady?.();
      } finally {
        setIsReady(true);
      }
    };

    waitForReady();
  }, [ldClient]);

  return isReady;
}

// Mirrors `RegionSelector`'s render gate so callers can avoid rendering surrounding chrome
// (e.g. labels, wrappers) when the selector itself won't appear.
export function useShouldShowRegionSelector(): boolean {
  const isLDReady = useLaunchDarklyReady();
  const isRegionSelectorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_REGION_SELECTOR_ENABLED, false);

  return !IS_EU && isLDReady && isRegionSelectorEnabled;
}
