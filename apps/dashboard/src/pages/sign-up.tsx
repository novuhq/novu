import { SignUp as SignUpForm, useAuth } from '@clerk/react';
import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthSideBanner } from '@/components/auth/auth-side-banner';
import { ConnectAuthSideBanner } from '@/components/auth/connect-auth-side-banner';
import { RegionPicker } from '@/components/auth/region-picker';
import { PageMeta } from '@/components/page-meta';
import { IS_NOVU_CONNECT, IS_SELF_HOSTED } from '@/config';
import { useSegment } from '@/context/segment';
import { clerkSignupAppearance } from '@/utils/clerk-appearance';
import { beginConnectProvisioning, buildConnectProvisionOrgListPath } from '@/utils/connect';
import {
  buildAbsoluteConnectUrl,
  buildPrimarySignUpUrl,
  CONNECT_PRODUCT_VALUE,
  PRODUCT_QUERY_PARAM,
} from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { getReferrer, getUtmParams } from '@/utils/tracking';

export const SignUpPage = () => {
  const segment = useSegment();
  const { isSignedIn, isLoaded } = useAuth();
  const [searchParams] = useSearchParams();
  const hasRedirectedRef = useRef(false);

  const isConnectSignUp = useMemo(
    () => searchParams.get(PRODUCT_QUERY_PARAM) === CONNECT_PRODUCT_VALUE || IS_NOVU_CONNECT,
    [searchParams]
  );

  // Clean Connect provisioning entry point. Always the same URL — Clerk's satellite domain SDK
  // performs the session-sync handshake natively when the destination page loads.
  const connectProvisionRedirect = useMemo(
    () => buildAbsoluteConnectUrl(buildConnectProvisionOrgListPath(ROUTES.SIGNUP_ORGANIZATION_LIST)),
    []
  );

  // Sign-up flows are primary-only — bounce satellite visitors back with Connect branding.
  useEffect(() => {
    if (IS_NOVU_CONNECT) {
      window.location.replace(buildPrimarySignUpUrl({ product: CONNECT_PRODUCT_VALUE }));
    }
  }, []);

  useEffect(() => {
    const utmParams = getUtmParams();
    const referrer = getReferrer();

    segment.track(TelemetryEvent.SIGN_UP_PAGE_VIEWED, {
      ...utmParams,
      referrer,
    });
  }, []);

  // Already-signed-in user landing on `/auth/sign-up` with Connect intent — hand off to Connect
  // immediately. We deliberately drop any inbound `redirect_url` (e.g. a stale `?__clerk_synced=false`
  // Connect URL) and always go to the clean provision entry point — Clerk's satellite SDK syncs
  // the session on arrival. Honoring the stale return URL is what caused the redirect loop.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || IS_NOVU_CONNECT || hasRedirectedRef.current) {
      return;
    }

    if (!isConnectSignUp) {
      return;
    }

    hasRedirectedRef.current = true;
    beginConnectProvisioning();
    window.location.assign(connectProvisionRedirect);
  }, [isLoaded, isSignedIn, isConnectSignUp, connectProvisionRedirect]);

  const signInUrlWithProduct = isConnectSignUp
    ? `${ROUTES.SIGN_IN}?${PRODUCT_QUERY_PARAM}=${CONNECT_PRODUCT_VALUE}`
    : ROUTES.SIGN_IN;

  // Render nothing while redirecting:
  //   - On the satellite (`IS_NOVU_CONNECT`) the page is mid-replace to primary.
  //   - On the primary when the user is already signed in the effect above is handling the bounce.
  if (IS_NOVU_CONNECT || (isLoaded && isSignedIn)) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:max-w-[1120px] md:flex-row md:gap-36">
      <PageMeta title={isConnectSignUp ? 'Sign up for Novu Connect' : 'Sign up for Novu'} />
      <div className="w-full shrink-0 md:w-auto">
        {isConnectSignUp ? <ConnectAuthSideBanner /> : <AuthSideBanner />}
      </div>
      <div className="flex flex-1 justify-end px-4 py-0 sm:py-0 md:items-center md:px-0">
        <div className="flex w-full max-w-[400px] flex-col items-start justify-start gap-[18px]">
          <SignUpForm
            path={ROUTES.SIGN_UP}
            signInUrl={signInUrlWithProduct}
            appearance={clerkSignupAppearance}
            forceRedirectUrl={isConnectSignUp ? connectProvisionRedirect : ROUTES.SIGNUP_ORGANIZATION_LIST}
          />
          {!IS_SELF_HOSTED && !isConnectSignUp && <RegionPicker />}
        </div>
      </div>
    </div>
  );
};
