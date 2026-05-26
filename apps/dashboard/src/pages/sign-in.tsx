import { AuthSideBanner } from '@/components/auth/auth-side-banner';
import { ConnectAuthSideBanner } from '@/components/auth/connect-auth-side-banner';
import { RegionPicker } from '@/components/auth/region-picker';
import { PageMeta } from '@/components/page-meta';
import { IS_NOVU_CONNECT, IS_SELF_HOSTED } from '@/config';
import { useSegment } from '@/context/segment';
import { buildAppHomeRoute, getCurrentAppId } from '@/utils/apps';
import { clerkSignupAppearance } from '@/utils/clerk-appearance';
import {
  beginConnectProvisioning,
  buildConnectProvisionOrgListPath,
  navigateToConnectWithClerkSession,
  redirectSatelliteToPrimarySignIn,
} from '@/utils/connect';
import { markInvitationAcceptIfPresent } from '@/utils/invitation-accept-signal';
import {
  buildAbsoluteConnectUrl,
  CONNECT_PRODUCT_VALUE,
  PRODUCT_QUERY_PARAM,
  readConnectSatelliteReturnUrl,
  resolveConnectSatelliteReturnUrl,
} from '@/utils/product-auth-urls';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { getReferrer, getUtmParams } from '@/utils/tracking';
import { SignIn as SignInForm, useAuth, useClerk } from '@clerk/react';
import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

export const SignInPage = () => {
  const segment = useSegment();
  const { isSignedIn, isLoaded } = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const hasRedirectedToPrimaryRef = useRef(false);
  const hasRedirectedToConnectRef = useRef(false);

  const isConnectSignIn = useMemo(
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

  // Sign-in only runs on the primary; satellite visitors bounce via Clerk.buildSignInUrl (sync params).
  useEffect(() => {
    if (!IS_NOVU_CONNECT || !clerk.loaded || hasRedirectedToPrimaryRef.current) {
      return;
    }

    hasRedirectedToPrimaryRef.current = true;
    const returnUrl = resolveConnectSatelliteReturnUrl(searchParams);

    redirectSatelliteToPrimarySignIn(clerk, returnUrl);
  }, [searchParams, location.hash, location.search, clerk.loaded, clerk]);

  // Capture invite-link entry (`__clerk_ticket` in the URL) BEFORE Clerk consumes the ticket
  // during sign-in. The picker reads this signal later to decide whether to hop across products.
  useEffect(() => {
    markInvitationAcceptIfPresent(searchParams);
  }, [searchParams]);

  useEffect(() => {
    const utmParams = getUtmParams();
    const referrer = getReferrer();

    segment.track(TelemetryEvent.SIGN_IN_PAGE_VIEWED, {
      ...utmParams,
      referrer,
    });
  }, []);

  // Primary → Connect after auth: Clerk redirectWithAuth syncs the session to the satellite.
  // Do not set forceRedirectUrl to a cross-origin Connect URL — that skips the handshake.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || IS_NOVU_CONNECT || !clerk.loaded || hasRedirectedToConnectRef.current) {
      return;
    }

    if (isConnectSignIn) {
      hasRedirectedToConnectRef.current = true;

      const destination = connectSatelliteReturnUrl ?? connectDefaultDestination;

      if (!connectSatelliteReturnUrl) {
        beginConnectProvisioning();
      }

      void navigateToConnectWithClerkSession(clerk, destination);

      return;
    }

    const home =
      buildAppHomeRoute(getCurrentAppId(), 'default') ?? buildRoute(ROUTES.WORKFLOWS, { environmentSlug: 'default' });

    navigate(home, { replace: true });
  }, [
    isLoaded,
    isSignedIn,
    isConnectSignIn,
    connectSatelliteReturnUrl,
    connectDefaultDestination,
    clerk,
    navigate,
  ]);

  // Preserve `?product=connect` across the Clerk sign-in ↔ sign-up link so branding survives.
  const signUpUrlWithProduct = isConnectSignIn
    ? `${ROUTES.SIGN_UP}?${PRODUCT_QUERY_PARAM}=${CONNECT_PRODUCT_VALUE}`
    : ROUTES.SIGN_UP;

  // Render nothing while redirecting — mounting <SignIn> while signed in makes Clerk bounce to the
  // home URL and causes a Platform ↔ Connect redirect loop during the satellite handshake.
  if (IS_NOVU_CONNECT || (isLoaded && isSignedIn)) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:max-w-[1120px] md:flex-row md:gap-36">
      <PageMeta title={isConnectSignIn ? 'Sign in to Novu Connect' : 'Sign in to Novu'} />
      <div className="w-full shrink-0 md:w-auto">
        {isConnectSignIn ? <ConnectAuthSideBanner /> : <AuthSideBanner />}
      </div>
      <div className="flex flex-1 justify-end px-4 py-8 md:items-center md:px-0 md:py-0">
        <div className="flex w-full max-w-[400px] flex-col items-start justify-start gap-[18px]">
          <SignInForm
            path={ROUTES.SIGN_IN}
            signUpUrl={signUpUrlWithProduct}
            appearance={clerkSignupAppearance}
          />
          {!IS_SELF_HOSTED && !isConnectSignIn && <RegionPicker />}
        </div>
      </div>
    </div>
  );
};
