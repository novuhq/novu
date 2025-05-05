import { clerkSignupAppearance } from '@/utils/clerk-appearance';
import { ROUTES } from '@/utils/routes';
import { SignIn as SignInForm } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { AuthSideBanner } from '../components/auth/auth-side-banner';
import { RegionPicker } from '../components/auth/region-picker';
import { PageMeta } from '../components/page-meta';
import { useSegment } from '../context/segment';
import { TelemetryEvent } from '../utils/telemetry';
import { getReferrer, getUtmParams } from '../utils/tracking';

export const SignInPage = () => {
  const segment = useSegment();

  useEffect(() => {
    const utmParams = getUtmParams();
    const referrer = getReferrer();

    segment.track(TelemetryEvent.SIGN_IN_PAGE_VIEWED, {
      ...utmParams,
      referrer,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col md:max-w-[1100px] md:flex-row md:gap-36">
      <PageMeta title="Sign in" />
      <div className="w-full md:w-auto">
        <AuthSideBanner />
      </div>
      <div className="flex flex-1 justify-end px-4 py-8 md:items-center md:px-0 md:py-0">
        <div className="flex w-full max-w-[400px] flex-col items-start justify-start gap-[18px]">
          <SignInForm path={ROUTES.SIGN_IN} signUpUrl={ROUTES.SIGN_UP} appearance={clerkSignupAppearance} />
          <RegionPicker />
        </div>
      </div>
    </div>
  );
};
