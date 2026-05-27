import { useEffect, useState } from 'react';
import { OnboardingLoader } from '@/components/onboarding/onboarding-loader';
import type { OnboardingLoaderVariant } from '@/components/onboarding/onboarding-loader';
import {
  getOnboardingProvisioningStartedAt,
  getOnboardingProvisioningVariant,
  isOnboardingProvisioningActive,
  subscribeOnboardingProvisioningChange,
} from '@/utils/connect/onboarding-session';

const AUTH_BACKGROUND_CLASS = "bg-[url('/images/auth/background.svg')] bg-cover bg-no-repeat bg-center";

type ProvisioningSession = {
  variant: OnboardingLoaderVariant;
  startedAt: number;
};

function readSession(): ProvisioningSession | null {
  const variant = getOnboardingProvisioningVariant();
  const startedAt = getOnboardingProvisioningStartedAt();

  if (!variant) {
    return null;
  }

  return { variant, startedAt: startedAt ?? Date.now() };
}

/**
 * Single full-screen onboarding provisioning state that stays mounted across org-list → onboarding
 * so the loader never remounts mid-flow. Shows the platform or connect variant based on session.
 */
export function OnboardingProvisioningOverlay() {
  const [session, setSession] = useState<ProvisioningSession | null>(readSession);

  useEffect(() => {
    const sync = () => {
      setSession((prev) => {
        const next = readSession();

        if (!next) {
          return null;
        }

        // Keep the original start time so client-side navigation does not restart the animation.
        if (prev?.variant === next.variant && prev.startedAt) {
          return { variant: next.variant, startedAt: prev.startedAt };
        }

        return next;
      });
    };

    sync();

    return subscribeOnboardingProvisioningChange(sync);
  }, []);

  if (!session || !isOnboardingProvisioningActive()) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center ${AUTH_BACKGROUND_CLASS}`}>
      <OnboardingLoader variant={session.variant} startedAt={session.startedAt} />
    </div>
  );
}
