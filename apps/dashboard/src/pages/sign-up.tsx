import { AuthSideBanner } from '@/components/auth/auth-side-banner';
import { ConnectAuthSideBanner } from '@/components/auth/connect-auth-side-banner';
import { RegionPicker } from '@/components/auth/region-picker';
import { PageMeta } from '@/components/page-meta';
import { IS_NOVU_CONNECT, IS_SELF_HOSTED } from '@/config';
import { useSegment } from '@/context/segment';
import { clerkSignupAppearance } from '@/utils/clerk-appearance';
import { beginConnectProvisioning, buildConnectProvisionOrgListPath, isActiveConnectWorkspace } from '@/utils/connect';
import { markInvitationAcceptIfPresent } from '@/utils/invitation-accept-signal';
import {
  buildAbsoluteConnectUrl,
  buildPrimarySignUpUrl,
  CONNECT_PRODUCT_VALUE,
  PRODUCT_QUERY_PARAM,
} from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { getReferrer, getUtmParams } from '@/utils/tracking';
import { SignUp as SignUpForm, useAuth, useOrganization, useUser } from '@clerk/react';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const SignUpPage = () => {
  const segment = useSegment();
  const { isSignedIn, isLoaded } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { organization, isLoaded: isOrganizationLoaded } = useOrganization();
  const [searchParams] = useSearchParams();

  const isConnectSignUp = useMemo(
    () => searchParams.get(PRODUCT_QUERY_PARAM) === CONNECT_PRODUCT_VALUE || IS_NOVU_CONNECT,
    [searchParams]
  );

  // Sign-up flows are primary-only — bounce satellite visitors back with Connect branding.
  useEffect(() => {
    if (IS_NOVU_CONNECT) {
      window.location.replace(buildPrimarySignUpUrl({ product: CONNECT_PRODUCT_VALUE }));
    }
  }, []);

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

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (IS_NOVU_CONNECT) return;
    if (!isConnectSignUp) return;
    if (!isUserLoaded || !isOrganizationLoaded) return;

    if (
      organization &&
      isActiveConnectWorkspace(organization.publicMetadata, {
        userId: user?.id,
        organizationId: organization.id,
      })
    ) {
      window.location.assign(buildAbsoluteConnectUrl(ROUTES.ENV));

      return;
    }

    beginConnectProvisioning();
    window.location.assign(buildAbsoluteConnectUrl(buildConnectProvisionOrgListPath(ROUTES.SIGNUP_ORGANIZATION_LIST)));
  }, [isLoaded, isSignedIn, isUserLoaded, isOrganizationLoaded, organization, user?.id, isConnectSignUp]);

  const connectProvisionRedirect = useMemo(
    () => buildAbsoluteConnectUrl(buildConnectProvisionOrgListPath(ROUTES.SIGNUP_ORGANIZATION_LIST)),
    []
  );

  const signInUrlWithProduct = isConnectSignUp
    ? `${ROUTES.SIGN_IN}?${PRODUCT_QUERY_PARAM}=${CONNECT_PRODUCT_VALUE}`
    : ROUTES.SIGN_IN;

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
