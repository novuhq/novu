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
    <div className="flex max-w-[1100px] gap-36">
      <PageMeta title="Sign in" />
      <AuthSideBanner />
      <div className="flex flex-1 items-center justify-end">
        <div className="flex flex-col items-start justify-start gap-4">
          <SignInForm path={ROUTES.SIGN_IN} signUpUrl={ROUTES.SIGN_UP} appearance={clerkSignupAppearance} />
          <RegionPicker />
        </div>
      </div>
    </div>
  );
};
