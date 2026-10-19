import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isOnboardingSource, stripOnboardingSource } from '@/utils/onboarding-redirect';

type WhatsNextGuideSessionState = {
  /** Whether the card should start expanded (in-session connect or first landing after onboarding). */
  defaultExpanded: boolean;
  /** Bypass the 24h hide — true during onboarding handoff or an in-session connect. */
  isFreshSession: boolean;
};

/**
 * Session signals for "What's next" guides: expanded on an in-session connect or the first landing
 * after onboarding (`fromOnboarding=1`); collapsed on later revisits once the param is stripped.
 */
export function useWhatsNextGuideSession(justConnected: boolean): WhatsNextGuideSessionState {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromOnboardingRef = useRef(isOnboardingSource(searchParams));

  useEffect(() => {
    if (!fromOnboardingRef.current) {
      return;
    }

    setSearchParams(stripOnboardingSource(searchParams), { replace: true });
  }, [searchParams, setSearchParams]);

  const isFreshSession = justConnected || fromOnboardingRef.current;

  return {
    defaultExpanded: isFreshSession,
    isFreshSession,
  };
}
