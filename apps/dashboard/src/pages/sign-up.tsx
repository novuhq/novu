import { SignUp as SignUpForm, useAuth } from '@clerk/react';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthSideBanner } from '@/components/auth/auth-side-banner';
import { RegionPicker } from '@/components/auth/region-picker';
import { PageMeta } from '@/components/page-meta';
import { IS_SELF_HOSTED } from '@/config';
import { useSegment } from '@/context/segment';
import { clerkSignupAppearance } from '@/utils/clerk-appearance';
import { appendRedirectUrlParam, readCliAuthReturnUrl } from '@/utils/cli-auth-pending';
import { storePendingConnectClaimFromRedirectUrl } from '@/utils/connect-claim-pending';
import { readClerkRedirectUrlParam } from '@/utils/product-auth-urls';
import { capturePendingProductType } from '@/utils/product-type-pending';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { getReferrer, getUtmParams } from '@/utils/tracking';

export const SignUpPage = () => {
  const segment = useSegment();
  const { isSignedIn, isLoaded } = useAuth();
  const [searchParams] = useSearchParams();

  // Persist pending CLI auth and connect claim from inbound redirect_url; org creation still runs first.
  useEffect(() => {
    readCliAuthReturnUrl(searchParams);
    storePendingConnectClaimFromRedirectUrl(readClerkRedirectUrlParam(searchParams));
    capturePendingProductType(searchParams);
  }, [searchParams]);

  useEffect(() => {
    const utmParams = getUtmParams();
    const referrer = getReferrer();

    segment.track(TelemetryEvent.SIGN_UP_PAGE_VIEWED, {
      ...utmParams,
      referrer,
    });
  }, []);

  // The agents `product_type` choice rides on sessionStorage (captured above), not the Clerk link:
  // Clerk's <SignUp> renders its sign-in link with hash routing and mangles any query we inject here.
  const signInUrlWithRedirect = useMemo(() => {
    const redirectUrl = readClerkRedirectUrlParam(searchParams);

    if (redirectUrl) {
      return appendRedirectUrlParam(ROUTES.SIGN_IN, redirectUrl);
    }

    return ROUTES.SIGN_IN;
  }, [searchParams]);

  // Render nothing while redirecting an already-signed-in user.
  if (isLoaded && isSignedIn) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:max-w-[1120px] md:flex-row md:gap-10 xl:gap-36">
      <PageMeta title="Sign up for Novu" />
      <div className="w-full shrink-0 md:w-auto">
        <AuthSideBanner />
      </div>
      <div className="flex flex-1 justify-center items-center px-4 py-0 sm:py-0 xl:justify-end md:px-0">
        <div className="flex w-full max-w-[400px] flex-col items-start justify-start gap-[18px]">
          <SignUpForm
            path={ROUTES.SIGN_UP}
            signInUrl={signInUrlWithRedirect}
            appearance={clerkSignupAppearance}
            forceRedirectUrl={ROUTES.SIGNUP_ORGANIZATION_LIST}
          />
          {!IS_SELF_HOSTED && <RegionPicker />}
        </div>
      </div>
    </div>
  );
};
