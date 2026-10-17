import { useAuth } from '@clerk/react';
import { SIGNUP_ANALYTICS_EVENTS } from '@novu/shared';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getKeylessClaimSource } from '@/api/connect';
import { useSegment } from '@/context/segment';
import { readConnectClaimTokenFromRedirectUrl, readPendingConnectClaim } from '@/utils/connect-claim-pending';
import { readClerkRedirectUrlParam } from '@/utils/product-auth-urls';
import { resolveSignupStartedProperties } from '@/utils/signup-started';

/**
 * Tracks `Signup Started` once per sign-up page visit by a signed-out user. A visit on the way back to a
 * claim link is attributed to whoever created that keyless environment.
 */
export function useTrackSignupStarted(extraProperties: Record<string, unknown> = {}) {
  const segment = useSegment();
  const { isLoaded, isSignedIn } = useAuth();
  const [searchParams] = useSearchParams();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || isSignedIn || hasTrackedRef.current) {
      return;
    }

    hasTrackedRef.current = true;
    const claimToken =
      readConnectClaimTokenFromRedirectUrl(readClerkRedirectUrlParam(searchParams)) ?? readPendingConnectClaim();

    void resolveSignupStartedProperties(claimToken, getKeylessClaimSource).then((properties) => {
      segment.track(SIGNUP_ANALYTICS_EVENTS.SIGNUP_STARTED, { ...extraProperties, ...properties });
    });
  }, [isLoaded, isSignedIn, searchParams, segment, extraProperties]);
}
