import { useEffect, useState } from 'react';
import type { OnboardingLoaderVariant } from '@/components/onboarding/onboarding-loader';
import {
  clearOnboardingProvisioning,
  getMinLoaderDurationMs,
  getOnboardingProvisioningStartedAt,
  getOnboardingProvisioningVariant,
  isOnboardingProvisioningActive,
  subscribeOnboardingProvisioningChange,
} from '@/utils/connect/onboarding-session';

export function useOnboardingProvisioningActive(): boolean {
  const [active, setActive] = useState(isOnboardingProvisioningActive);

  useEffect(() => {
    const sync = () => setActive(isOnboardingProvisioningActive());

    sync();

    return subscribeOnboardingProvisioningChange(sync);
  }, []);

  return active;
}

/**
 * Keeps the full-screen provisioning overlay visible until the step animation has had time
 * to finish, even when backend setup completes earlier.
 */
export function useOnboardingProvisioningDismiss({
  isReady,
  fallbackVariant,
}: {
  isReady: boolean;
  fallbackVariant: OnboardingLoaderVariant;
}): void {
  const provisioningActive = useOnboardingProvisioningActive();

  useEffect(() => {
    if (!isReady || !provisioningActive) {
      return;
    }

    const variant = getOnboardingProvisioningVariant() ?? fallbackVariant;
    const startedAt = getOnboardingProvisioningStartedAt() ?? Date.now();
    const remaining = Math.max(0, getMinLoaderDurationMs(variant) - (Date.now() - startedAt));
    const timer = setTimeout(() => clearOnboardingProvisioning(), remaining);

    return () => clearTimeout(timer);
  }, [isReady, provisioningActive, fallbackVariant]);
}
