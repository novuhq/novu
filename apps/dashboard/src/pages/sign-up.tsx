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
import { appendRedirectUrlParam, readCliAuthReturnUrl } from '@/utils/cli-auth-pending';
import { storePendingConnectClaimFromRedirectUrl } from '@/utils/connect-claim-pending';
import { buildConnectProvisionOrgListPath } from '@/utils/connect';
import {
  buildAbsoluteConnectUrl,
  buildPrimarySignUpUrl,
  CONNECT_PRODUCT_VALUE,
  PRODUCT_QUERY_PARAM,
  readClerkRedirectUrlParam,
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

  // Clean Connect provisioning entry point. Always the same URL — primary's session cookies
  // live on the shared registrable domain, so the Connect host loads signed-in immediately.
  const connectProvisionRedirect = useMemo(
    () => buildAbsoluteConnectUrl(buildConnectProvisionOrgListPath(ROUTES.SIGNUP_ORGANIZATION_LIST)),
    []
  );

  // Persist pending CLI auth from inbound redirect_url; org creation still runs first.
  useEffect(() => {
    readCliAuthReturnUrl(searchParams, { preferConnectHost: isConnectSignUp });
    storePendingConnectClaimFromRedirectUrl(readClerkRedirectUrlParam(searchParams));
  }, [searchParams, isConnectSignUp]);

  // Sign-up flows are primary-only — bounce Connect-host visitors back with Connect branding.
  useEffect(() => {
    if (IS_NOVU_CONNECT) {
      const redirectUrl = readClerkRedirectUrlParam(searchParams);
      let primaryUrl = buildPrimarySignUpUrl({ product: CONNECT_PRODUCT_VALUE });

      if (redirectUrl) {
        primaryUrl = appendRedirectUrlParam(primaryUrl, redirectUrl);
      }

      window.location.replace(primaryUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    const utmParams = getUtmParams();
    const referrer = getReferrer();

    segment.track(TelemetryEvent.SIGN_UP_PAGE_VIEWED, {
      ...utmParams,
      referrer,
    });
  }, []);

  // Already-signed-in user landing on `/auth/sign-up` with Connect intent — hand off to Connect
  // immediately. The Connect host shares Clerk session cookies with primary via the registrable
  // domain, so it loads signed-in from a plain navigation. Inbound `redirect_url` is dropped and
  // we always go to the clean provision entry point so a stale return URL can't strand the user.
  // CLI auth resumes through pending session storage after org provisioning completes.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || IS_NOVU_CONNECT || hasRedirectedRef.current) {
      return;
    }

    if (!isConnectSignUp) {
      return;
    }

    hasRedirectedRef.current = true;
    window.location.assign(connectProvisionRedirect);
  }, [isLoaded, isSignedIn, isConnectSignUp, connectProvisionRedirect]);

  const signInUrlWithProduct = useMemo(() => {
    const redirectUrl = readClerkRedirectUrlParam(searchParams);
    let url = isConnectSignUp ? `${ROUTES.SIGN_IN}?${PRODUCT_QUERY_PARAM}=${CONNECT_PRODUCT_VALUE}` : ROUTES.SIGN_IN;

    if (redirectUrl) {
      url = appendRedirectUrlParam(url, redirectUrl);
    }

    return url;
  }, [searchParams, isConnectSignUp]);

  // Render nothing while redirecting:
  //   - On the Connect host (`IS_NOVU_CONNECT`) the page is mid-replace to primary.
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
