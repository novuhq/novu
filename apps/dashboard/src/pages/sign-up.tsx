import { AuthSideBanner } from '@/components/auth/auth-side-banner';
import { ConnectAuthSideBanner } from '@/components/auth/connect-auth-side-banner';
import { RegionPicker } from '@/components/auth/region-picker';
import { PageMeta } from '@/components/page-meta';
import { IS_NOVU_CONNECT, IS_SELF_HOSTED } from '@/config';
import { useSegment } from '@/context/segment';
import { clerkSignupAppearance } from '@/utils/clerk-appearance';
import {
  beginConnectProvisioning,
  buildConnectProvisionOrgListPath,
  navigateToConnectWithClerkSession,
  redirectSatelliteToPrimarySignUp,
} from '@/utils/connect';
import { markInvitationAcceptIfPresent } from '@/utils/invitation-accept-signal';
import {
  buildAbsoluteConnectUrl,
  CONNECT_PRODUCT_VALUE,
  PRODUCT_QUERY_PARAM,
  readConnectSatelliteReturnUrl,
  resolveConnectSatelliteReturnUrl,
} from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { getReferrer, getUtmParams } from '@/utils/tracking';
import { SignUp as SignUpForm, useAuth, useClerk } from '@clerk/react';
import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

export const SignUpPage = () => {
  const segment = useSegment();
  const { isSignedIn, isLoaded } = useAuth();
  const clerk = useClerk();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const hasRedirectedToPrimaryRef = useRef(false);
  const hasRedirectedToConnectRef = useRef(false);

  const isConnectSignUp = useMemo(
    () => searchParams.get(PRODUCT_QUERY_PARAM) === CONNECT_PRODUCT_VALUE || IS_NOVU_CONNECT,
    [searchParams]
  );

  const connectSatelliteReturnUrl = useMemo(
    () => readConnectSatelliteReturnUrl(searchParams),
    [searchParams, location.hash, location.search]
  );

  const connectDefaultDestination = useMemo(
    () => buildAbsoluteConnectUrl(buildConnectProvisionOrgListPath(ROUTES.SIGNUP_ORGANIZATION_LIST)),
    []
  );

  // Sign-up flows are primary-only — bounce satellite visitors via Clerk.buildSignUpUrl (sync params).
  useEffect(() => {
    if (!IS_NOVU_CONNECT || !clerk.loaded || hasRedirectedToPrimaryRef.current) {
      return;
    }

    hasRedirectedToPrimaryRef.current = true;
    const returnUrl = resolveConnectSatelliteReturnUrl(searchParams);

    redirectSatelliteToPrimarySignUp(clerk, returnUrl);
  }, [searchParams, location.hash, location.search, clerk.loaded, clerk]);

  // Capture invite-link entry (`__clerk_ticket` in the URL) BEFORE Clerk consumes the ticket
  // during sign-up. The picker reads this signal later to decide whether to hop across products.
  useEffect(() => {
    markInvitationAcceptIfPresent(searchParams);
  }, [searchParams]);

  useEffect(() => {
    const utmParams = getUtmParams();
    const referrer = getReferrer();

    segment.track(TelemetryEvent.SIGN_UP_PAGE_VIEWED, {
      ...utmParams,
      referrer,
    });
  }, []);

  // Primary → Connect after auth: Clerk redirectWithAuth syncs the session to the satellite.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || IS_NOVU_CONNECT || !clerk.loaded || hasRedirectedToConnectRef.current) {
      return;
    }

    if (!isConnectSignUp) {
      return;
    }

    hasRedirectedToConnectRef.current = true;

    const destination = connectSatelliteReturnUrl ?? connectDefaultDestination;

    if (!connectSatelliteReturnUrl) {
      beginConnectProvisioning();
    }

    void navigateToConnectWithClerkSession(clerk, destination);
  }, [isLoaded, isSignedIn, isConnectSignUp, connectSatelliteReturnUrl, connectDefaultDestination, clerk]);

  const signInUrlWithProduct = isConnectSignUp
    ? `${ROUTES.SIGN_IN}?${PRODUCT_QUERY_PARAM}=${CONNECT_PRODUCT_VALUE}`
    : ROUTES.SIGN_IN;

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
            forceRedirectUrl={isConnectSignUp ? undefined : ROUTES.SIGNUP_ORGANIZATION_LIST}
          />
          {!IS_SELF_HOSTED && !isConnectSignUp && <RegionPicker />}
        </div>
      </div>
    </div>
  );
};
