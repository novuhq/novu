import { AuthSideBanner } from '@/components/auth/auth-side-banner';
import { ConnectAuthSideBanner } from '@/components/auth/connect-auth-side-banner';
import { RegionPicker } from '@/components/auth/region-picker';
import { PageMeta } from '@/components/page-meta';
import { IS_NOVU_CONNECT, IS_SELF_HOSTED } from '@/config';
import { useSegment } from '@/context/segment';
import { buildAppHomeRoute, getCurrentAppId } from '@/utils/apps';
import { clerkSignupAppearance } from '@/utils/clerk-appearance';
import { beginConnectProvisioning, buildConnectProvisionOrgListPath, isActiveConnectWorkspace } from '@/utils/connect';
import {
  buildAbsoluteConnectUrl,
  buildPrimarySignInUrl,
  CONNECT_PRODUCT_VALUE,
  PRODUCT_QUERY_PARAM,
} from '@/utils/product-auth-urls';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { getReferrer, getUtmParams } from '@/utils/tracking';
import { SignIn as SignInForm, useAuth, useOrganization, useUser } from '@clerk/clerk-react';
import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const SignInPage = () => {
  const segment = useSegment();
  const { isSignedIn, isLoaded } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { organization, isLoaded: isOrganizationLoaded } = useOrganization();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /**
   * Connect-branded sign-in is driven by the query param the satellite appends to Clerk's
   * `signInUrl`. We also fall back to `IS_NOVU_CONNECT` so visiting `/auth/sign-in` directly on
   * the satellite (e.g. via a stale tab) renders Connect copy before the satellite redirect
   * fires.
   */
  const isConnectSignIn = useMemo(
    () => searchParams.get(PRODUCT_QUERY_PARAM) === CONNECT_PRODUCT_VALUE || IS_NOVU_CONNECT,
    [searchParams]
  );

  /*
   * Sign-in only runs on the primary domain. If the satellite renders this page (direct nav
   * or hot-tab) we hard-redirect to the primary's sign-in carrying the Connect flag so the
   * primary renders Connect-branded UI.
   */
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

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (IS_NOVU_CONNECT) return; // satellite is mid-redirect to primary; let it finish.

    if (isConnectSignIn) {
      if (!isUserLoaded || !isOrganizationLoaded) return;

      if (
        organization &&
        isActiveConnectWorkspace(organization.publicMetadata, {
          userId: user?.id,
          organizationId: organization.id,
        })
      ) {
        /*
         * Authenticated Connect user signing in on the primary — send them to the Connect
         * satellite. Clerk's session sync on the satellite picks up the cookie automatically.
         */
        window.location.assign(buildAbsoluteConnectUrl(ROUTES.ENV));

        return;
      }

      beginConnectProvisioning();
      window.location.assign(
        buildAbsoluteConnectUrl(buildConnectProvisionOrgListPath(ROUTES.SIGNUP_ORGANIZATION_LIST))
      );

      return;
    }

    const home =
      buildAppHomeRoute(getCurrentAppId(), 'default') ?? buildRoute(ROUTES.WORKFLOWS, { environmentSlug: 'default' });

    navigate(home, { replace: true });
  }, [isLoaded, isSignedIn, isUserLoaded, isOrganizationLoaded, organization, user?.id, isConnectSignIn, navigate]);

  const connectProvisionRedirect = useMemo(
    () => buildAbsoluteConnectUrl(buildConnectProvisionOrgListPath(ROUTES.SIGNUP_ORGANIZATION_LIST)),
    []
  );

  // Keep the `?product=connect` flag attached when Clerk's internal sign-in/sign-up link
  // navigates the user across the auth flow — otherwise the sister page loses Connect branding.
  const signUpUrlWithProduct = isConnectSignIn
    ? `${ROUTES.SIGN_UP}?${PRODUCT_QUERY_PARAM}=${CONNECT_PRODUCT_VALUE}`
    : ROUTES.SIGN_UP;

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
