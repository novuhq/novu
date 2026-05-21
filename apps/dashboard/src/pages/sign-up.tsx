import { SignUp as SignUpForm, useAuth, useOrganization, useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthSideBanner } from '@/components/auth/auth-side-banner';
import { ConnectAuthSideBanner } from '@/components/auth/connect-auth-side-banner';
import { RegionPicker } from '@/components/auth/region-picker';
import { PageMeta } from '@/components/page-meta';
import { clerkSignupAppearance } from '@/utils/clerk-appearance';
import {
  beginConnectProvisioning,
  buildConnectProvisionOrgListPath,
  isActiveConnectWorkspace,
} from '@/utils/connect';
import { ROUTES } from '@/utils/routes';
import { IS_NOVU_CONNECT, IS_SELF_HOSTED } from '../config';
import { useSegment } from '../context/segment';
import { TelemetryEvent } from '../utils/telemetry';
import { getReferrer, getUtmParams } from '../utils/tracking';

export const SignUpPage = () => {
  const segment = useSegment();
  const { isSignedIn, isLoaded } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { organization, isLoaded: isOrganizationLoaded } = useOrganization();
  const navigate = useNavigate();

  useEffect(() => {
    const utmParams = getUtmParams();
    const referrer = getReferrer();

    segment.track(TelemetryEvent.SIGN_UP_PAGE_VIEWED, {
      ...utmParams,
      referrer,
    });
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !IS_NOVU_CONNECT) return;
    if (!isUserLoaded || !isOrganizationLoaded) return;

    if (
      organization &&
      isActiveConnectWorkspace(organization.publicMetadata, {
        userId: user?.id,
        organizationId: organization.id,
      })
    ) {
      navigate(ROUTES.ENV, { replace: true });

      return;
    }

    beginConnectProvisioning();
    navigate(ROUTES.SIGNUP_ORGANIZATION_LIST, { replace: true });
  }, [isLoaded, isSignedIn, isUserLoaded, isOrganizationLoaded, organization, user?.id, navigate]);

  return (
    <div className="flex min-h-screen w-full flex-col md:max-w-[1120px] md:flex-row md:gap-36">
      <PageMeta title={IS_NOVU_CONNECT ? 'Sign up for Novu Connect' : 'Sign up for Novu'} />
      <div className="w-full shrink-0 md:w-auto">
        {IS_NOVU_CONNECT ? <ConnectAuthSideBanner /> : <AuthSideBanner />}
      </div>
      <div className="flex flex-1 justify-end px-4 py-0 sm:py-0 md:items-center md:px-0">
        <div className="flex w-full max-w-[400px] flex-col items-start justify-start gap-[18px]">
          <SignUpForm
            path={ROUTES.SIGN_UP}
            signInUrl={ROUTES.SIGN_IN}
            appearance={clerkSignupAppearance}
            forceRedirectUrl={
              IS_NOVU_CONNECT
                ? buildConnectProvisionOrgListPath(ROUTES.SIGNUP_ORGANIZATION_LIST)
                : ROUTES.SIGNUP_ORGANIZATION_LIST
            }
          />
          {!IS_SELF_HOSTED && !IS_NOVU_CONNECT && <RegionPicker />}
        </div>
      </div>
    </div>
  );
};
