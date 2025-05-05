import { AuthSideBanner } from '@/components/auth/auth-side-banner';
import { RegionPicker } from '@/components/auth/region-picker';
import { PageMeta } from '@/components/page-meta';
import { clerkSignupAppearance } from '@/utils/clerk-appearance';
import { ROUTES } from '@/utils/routes';
import { SignUp as SignUpForm } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useSegment } from '../context/segment';
import { TelemetryEvent } from '../utils/telemetry';
import { getReferrer, getUtmParams } from '../utils/tracking';

export const SignUpPage = () => {
  const segment = useSegment();

  useEffect(() => {
    const utmParams = getUtmParams();
    const referrer = getReferrer();

    segment.track(TelemetryEvent.SIGN_UP_PAGE_VIEWED, {
      ...utmParams,
      referrer,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col md:max-w-[1100px] md:flex-row md:gap-36">
      <PageMeta title="Sign up" />
      <div className="w-full md:w-auto">
        <AuthSideBanner />
      </div>
      <div className="flex flex-1 justify-end px-4 py-0 sm:py-0 md:items-center md:px-0">
        <div className="flex w-full max-w-[400px] flex-col items-start justify-start gap-[18px]">
          <SignUpForm
            path={ROUTES.SIGN_UP}
            signInUrl={ROUTES.SIGN_IN}
            appearance={clerkSignupAppearance}
            forceRedirectUrl={ROUTES.SIGNUP_ORGANIZATION_LIST}
          />
          <RegionPicker />
        </div>
      </div>
    </div>
  );
};
