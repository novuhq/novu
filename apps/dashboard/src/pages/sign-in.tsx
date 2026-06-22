import { SignIn as SignInForm, useAuth } from '@clerk/react';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthSideBanner } from '@/components/auth/auth-side-banner';
import { RegionPicker } from '@/components/auth/region-picker';
import { PageMeta } from '@/components/page-meta';
import { IS_SELF_HOSTED } from '@/config';
import { useSegment } from '@/context/segment';
import { clerkSignupAppearance } from '@/utils/clerk-appearance';
import {
  appendRedirectUrlParam,
  buildCliAuthReturnUrlFromSearchParams,
  parseCliAuthReturnFromSearchParams,
  resolvePendingCliAuthReturnUrl,
  storePendingCliAuth,
} from '@/utils/cli-auth-pending';
import {
  buildConnectClaimReturnUrlFromSearchParams,
  resolvePendingConnectClaimReturnUrl,
  storePendingConnectClaimFromRedirectUrl,
} from '@/utils/connect-claim-pending';
import { readClerkRedirectUrlParam } from '@/utils/product-auth-urls';
import { capturePendingProductType } from '@/utils/product-type-pending';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { getReferrer, getUtmParams } from '@/utils/tracking';

export const SignInPage = () => {
  const segment = useSegment();
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasRedirectedRef = useRef(false);

  const cliAuthReturnUrl = useMemo(
    () => buildCliAuthReturnUrlFromSearchParams(searchParams) ?? resolvePendingCliAuthReturnUrl(),
    [searchParams]
  );
  const connectClaimReturnUrl = useMemo(
    () => buildConnectClaimReturnUrlFromSearchParams(searchParams) ?? resolvePendingConnectClaimReturnUrl(),
    [searchParams]
  );

  useEffect(() => {
    const pending = parseCliAuthReturnFromSearchParams(searchParams);

    if (pending) {
      storePendingCliAuth(pending.deviceCode, pending.name);
    }

    storePendingConnectClaimFromRedirectUrl(readClerkRedirectUrlParam(searchParams));
    capturePendingProductType(searchParams);
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
  // CLI auth is the exception: the device session must resume on `/cli/auth` after sign-in.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;

    if (cliAuthReturnUrl) {
      window.location.assign(cliAuthReturnUrl);

      return;
    }

    if (connectClaimReturnUrl) {
      window.location.assign(connectClaimReturnUrl);

      return;
    }

    void navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug: 'default' }), { replace: true });
  }, [isLoaded, isSignedIn, cliAuthReturnUrl, connectClaimReturnUrl, navigate]);

  // The agents `product_type` choice rides on sessionStorage (captured above), not the Clerk link:
  // Clerk's <SignIn> renders its sign-up link with hash routing and mangles any query we inject here.
  const signUpUrlWithRedirect = useMemo(() => {
    const redirectUrl = readClerkRedirectUrlParam(searchParams);

    if (redirectUrl) {
      return appendRedirectUrlParam(ROUTES.SIGN_UP, redirectUrl);
    }

    return ROUTES.SIGN_UP;
  }, [searchParams]);

  // Render nothing while redirecting an already-signed-in user; mounting <SignIn> would also try to
  // navigate via `forceRedirectUrl`, creating a race.
  if (isLoaded && isSignedIn) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:max-w-[1120px] md:flex-row md:gap-10 xl:gap-36">
      <PageMeta title="Sign in to Novu" />
      <div className="w-full shrink-0 md:w-auto">
        <AuthSideBanner />
      </div>
      <div className="flex flex-1 justify-center items-center px-4 py-0 sm:py-0 xl:justify-end md:px-0">
        <div className="flex w-full max-w-[400px] flex-col items-start justify-start gap-[18px] [&>.cl-rootBox,.cl-cardBox]:w-full!">
          <SignInForm
            path={ROUTES.SIGN_IN}
            signUpUrl={signUpUrlWithRedirect}
            appearance={clerkSignupAppearance}
            forceRedirectUrl={cliAuthReturnUrl ?? connectClaimReturnUrl ?? undefined}
          />
          {!IS_SELF_HOSTED && <RegionPicker />}
        </div>
      </div>
    </div>
  );
};
