import { SignIn as SignInForm, useAuth } from '@clerk/react';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthSideBanner } from '@/components/auth/auth-side-banner';
import { ConnectAuthSideBanner } from '@/components/auth/connect-auth-side-banner';
import { RegionPicker } from '@/components/auth/region-picker';
import { PageMeta } from '@/components/page-meta';
import { IS_NOVU_CONNECT, IS_SELF_HOSTED } from '@/config';
import { useSegment } from '@/context/segment';
import { buildAppHomeRoute, getCurrentAppId } from '@/utils/apps';
import { clerkSignupAppearance } from '@/utils/clerk-appearance';
import { beginConnectProvisioning, buildConnectProvisionOrgListPath } from '@/utils/connect';
import {
  buildAbsoluteConnectUrl,
  buildPrimarySignInUrl,
  CONNECT_PRODUCT_VALUE,
  PRODUCT_QUERY_PARAM,
} from '@/utils/product-auth-urls';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { getReferrer, getUtmParams } from '@/utils/tracking';

export const SignInPage = () => {
  const segment = useSegment();
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasRedirectedRef = useRef(false);

  const isConnectSignIn = useMemo(
    () => searchParams.get(PRODUCT_QUERY_PARAM) === CONNECT_PRODUCT_VALUE || IS_NOVU_CONNECT,
    [searchParams]
  );

  // Clean Connect provisioning entry point. Always the same URL — Clerk's satellite domain SDK
  // performs the session-sync handshake natively when the destination page loads.
  const connectProvisionRedirect = useMemo(
    () => buildAbsoluteConnectUrl(buildConnectProvisionOrgListPath(ROUTES.SIGNUP_ORGANIZATION_LIST)),
    []
  );

  // Sign-in only runs on the primary; satellite visitors bounce back with the Connect flag.
  useEffect(() => {
    if (IS_NOVU_CONNECT) {
      window.location.replace(buildPrimarySignInUrl({ product: CONNECT_PRODUCT_VALUE }));
    }
  }, []);

  useEffect(() => {
    const utmParams = getUtmParams();
    const referrer = getReferrer();

    segment.track(TelemetryEvent.SIGN_IN_PAGE_VIEWED, {
      ...utmParams,
      referrer,
    });
  }, []);

  // Already-signed-in user landing on `/auth/sign-in` — bounce to the right home before the
  // <SignIn/> form mounts and starts its own redirect (which would race this effect).
  //
  // For Connect flows we deliberately drop any inbound `redirect_url` (e.g. a stale
  // `?__clerk_synced=false` Connect URL) and always go to the clean provision entry point —
  // Clerk's satellite SDK syncs the session on arrival. Honoring the stale return URL is what
  // caused the Platform ↔ Connect redirect loop after the post-PR-11281 follow-ups.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || IS_NOVU_CONNECT || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;

    if (isConnectSignIn) {
      beginConnectProvisioning();
      window.location.assign(connectProvisionRedirect);

      return;
    }

    const home =
      buildAppHomeRoute(getCurrentAppId(), 'default') ?? buildRoute(ROUTES.WORKFLOWS, { environmentSlug: 'default' });

    void navigate(home, { replace: true });
  }, [isLoaded, isSignedIn, isConnectSignIn, connectProvisionRedirect, navigate]);

  // Preserve `?product=connect` across the Clerk sign-in ↔ sign-up link so branding survives.
  const signUpUrlWithProduct = isConnectSignIn
    ? `${ROUTES.SIGN_UP}?${PRODUCT_QUERY_PARAM}=${CONNECT_PRODUCT_VALUE}`
    : ROUTES.SIGN_UP;

  // Render nothing while redirecting:
  //   - On the satellite (`IS_NOVU_CONNECT`) the page is mid-replace to primary.
  //   - On the primary when the user is already signed in the effect above is handling the bounce;
  //     mounting <SignIn> here would also try to navigate via `forceRedirectUrl`, creating a race.
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
            forceRedirectUrl={isConnectSignIn ? connectProvisionRedirect : undefined}
          />
          {!IS_SELF_HOSTED && !isConnectSignIn && <RegionPicker />}
        </div>
      </div>
    </div>
  );
};
