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
import {
  appendRedirectUrlParam,
  buildCliAuthReturnUrlFromSearchParams,
  parseCliAuthReturnFromSearchParams,
  resolvePendingCliAuthReturnUrl,
  storePendingCliAuth,
} from '@/utils/cli-auth-pending';
import { buildConnectProvisionOrgListPath } from '@/utils/connect';
import { storePendingConnectClaimFromRedirectUrl } from '@/utils/connect-claim-pending';
import {
  buildAbsoluteConnectUrl,
  buildPrimarySignInUrl,
  CONNECT_PRODUCT_VALUE,
  PRODUCT_QUERY_PARAM,
  readClerkRedirectUrlParam,
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

  // Clean Connect provisioning entry point. Always the same URL — primary's session cookies
  // live on the shared registrable domain, so the Connect host loads signed-in immediately.
  const connectProvisionRedirect = useMemo(
    () => buildAbsoluteConnectUrl(buildConnectProvisionOrgListPath(ROUTES.SIGNUP_ORGANIZATION_LIST)),
    []
  );

  const cliAuthReturnUrl = useMemo(
    () =>
      buildCliAuthReturnUrlFromSearchParams(searchParams, { preferConnectHost: isConnectSignIn }) ??
      resolvePendingCliAuthReturnUrl(),
    [searchParams, isConnectSignIn]
  );

  useEffect(() => {
    const pending = parseCliAuthReturnFromSearchParams(searchParams, { preferConnectHost: isConnectSignIn });

    if (pending) {
      storePendingCliAuth(pending.deviceCode, pending.name, pending.returnHost);
    }

    storePendingConnectClaimFromRedirectUrl(readClerkRedirectUrlParam(searchParams));
  }, [searchParams, isConnectSignIn]);

  // Sign-in only runs on the primary; Connect-host visitors bounce back with the Connect flag.
  useEffect(() => {
    if (IS_NOVU_CONNECT) {
      const redirectUrl = readClerkRedirectUrlParam(searchParams);
      let primaryUrl = buildPrimarySignInUrl({ product: CONNECT_PRODUCT_VALUE });

      if (redirectUrl) {
        primaryUrl = appendRedirectUrlParam(primaryUrl, redirectUrl);
      }

      window.location.replace(primaryUrl);
    }
  }, [searchParams]);

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
  // For Connect flows we always go to the clean provision entry point. The Connect host shares
  // Clerk session cookies with primary via the registrable domain, so it loads signed-in from a
  // plain navigation. Inbound `redirect_url` is dropped so a stale return URL can't strand the
  // user.
  // CLI auth is the exception: the device session must resume on `/cli/auth` after sign-in.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || IS_NOVU_CONNECT || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;

    if (cliAuthReturnUrl) {
      window.location.assign(cliAuthReturnUrl);

      return;
    }

    if (isConnectSignIn) {
      window.location.assign(connectProvisionRedirect);

      return;
    }

    const home =
      buildAppHomeRoute(getCurrentAppId(), 'default') ?? buildRoute(ROUTES.WORKFLOWS, { environmentSlug: 'default' });

    void navigate(home, { replace: true });
  }, [isLoaded, isSignedIn, isConnectSignIn, connectProvisionRedirect, cliAuthReturnUrl, navigate]);

  const signUpUrlWithProduct = useMemo(() => {
    const redirectUrl = readClerkRedirectUrlParam(searchParams);
    let url = isConnectSignIn ? `${ROUTES.SIGN_UP}?${PRODUCT_QUERY_PARAM}=${CONNECT_PRODUCT_VALUE}` : ROUTES.SIGN_UP;

    if (redirectUrl) {
      url = appendRedirectUrlParam(url, redirectUrl);
    }

    return url;
  }, [searchParams, isConnectSignIn]);

  // Render nothing while redirecting:
  //   - On the Connect host (`IS_NOVU_CONNECT`) the page is mid-replace to primary.
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
            forceRedirectUrl={cliAuthReturnUrl ?? (isConnectSignIn ? connectProvisionRedirect : undefined)}
          />
          {!IS_SELF_HOSTED && !isConnectSignIn && <RegionPicker />}
        </div>
      </div>
    </div>
  );
};
