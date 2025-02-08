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
    <div className="flex max-w-[1100px] gap-36">
      <PageMeta title="Sign up" />
      <AuthSideBanner />
      <div className="flex flex-1 items-center justify-end">
        <div className="flex flex-col items-start justify-start gap-[18px]">
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
