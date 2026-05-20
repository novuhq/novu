import { SignIn as SignInForm, useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildAppHomeRoute, getCurrentAppId } from '@/utils/apps';
import { clerkSignupAppearance } from '@/utils/clerk-appearance';
import { buildRoute, ROUTES } from '@/utils/routes';
import { AuthSideBanner } from '../components/auth/auth-side-banner';
import { ConnectAuthSideBanner } from '../components/auth/connect-auth-side-banner';
import { RegionPicker } from '../components/auth/region-picker';
import { PageMeta } from '../components/page-meta';
import { IS_NOVU_CONNECT, IS_SELF_HOSTED } from '../config';
import { useSegment } from '../context/segment';
import { TelemetryEvent } from '../utils/telemetry';
import { getReferrer, getUtmParams } from '../utils/tracking';

export const SignInPage = () => {
  const segment = useSegment();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const utmParams = getUtmParams();
    const referrer = getReferrer();

    segment.track(TelemetryEvent.SIGN_IN_PAGE_VIEWED, {
      ...utmParams,
      referrer,
    });
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;

    // Hostname is the source of truth: Connect host → Connect home, Platform host → workflows.
    const home =
      buildAppHomeRoute(getCurrentAppId(), 'default') ?? buildRoute(ROUTES.WORKFLOWS, { environmentSlug: 'default' });

    navigate(home);
  }, [isSignedIn]);

  return (
    <div className="flex min-h-screen w-full flex-col md:max-w-[1120px] md:flex-row md:gap-36">
      <PageMeta title={IS_NOVU_CONNECT ? 'Sign in to Novu Connect' : 'Sign in to Novu'} />
      <div className="w-full shrink-0 md:w-auto">
        {IS_NOVU_CONNECT ? <ConnectAuthSideBanner /> : <AuthSideBanner />}
      </div>
      <div className="flex flex-1 justify-end px-4 py-8 md:items-center md:px-0 md:py-0">
        <div className="flex w-full max-w-[400px] flex-col items-start justify-start gap-[18px]">
          <SignInForm path={ROUTES.SIGN_IN} signUpUrl={ROUTES.SIGN_UP} appearance={clerkSignupAppearance} />
          {!IS_SELF_HOSTED && !IS_NOVU_CONNECT && <RegionPicker />}
        </div>
      </div>
    </div>
  );
};
