import { SignIn as SignInForm, useAuth } from '@clerk/clerk-react';
import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clerkSignupAppearance } from '@/utils/clerk-appearance';
import { buildRoute, ROUTES } from '@/utils/routes';
import { AuthSideBanner } from '../components/auth/auth-side-banner';
import { RegionPicker } from '../components/auth/region-picker';
import { PageMeta } from '../components/page-meta';
import { IS_SELF_HOSTED } from '../config';
import { useSegment } from '../context/segment';
import { TelemetryEvent } from '../utils/telemetry';
import { getReferrer, getUtmParams } from '../utils/tracking';

function isSafeRedirectUrl(value: string | null): value is string {
  if (!value) return false;
  return value.startsWith('/') && !value.startsWith('//');
}

export const SignInPage = () => {
  const segment = useSegment();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectUrl = useMemo(() => {
    const candidate = searchParams.get('redirect_url');

    return isSafeRedirectUrl(candidate) ? candidate : null;
  }, [searchParams]);

  const signUpUrl = useMemo(() => {
    if (!redirectUrl) return ROUTES.SIGN_UP;

    return `${ROUTES.SIGN_UP}?redirect_url=${encodeURIComponent(redirectUrl)}`;
  }, [redirectUrl]);

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

    if (redirectUrl) {
      navigate(redirectUrl, { replace: true });

      return;
    }

    navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug: 'default' }));
  }, [isSignedIn, redirectUrl, navigate]);

  return (
    <div className="flex min-h-screen w-full flex-col md:max-w-[1100px] md:flex-row md:gap-36">
      <PageMeta title="Sign in to Novu" />
      <div className="w-full md:w-auto">
        <AuthSideBanner />
      </div>
      <div className="flex flex-1 justify-end px-4 py-8 md:items-center md:px-0 md:py-0">
        <div className="flex w-full max-w-[400px] flex-col items-start justify-start gap-[18px]">
          <SignInForm
            path={ROUTES.SIGN_IN}
            signUpUrl={signUpUrl}
            forceRedirectUrl={redirectUrl ?? undefined}
            appearance={clerkSignupAppearance}
          />
          {!IS_SELF_HOSTED && <RegionPicker />}
        </div>
      </div>
    </div>
  );
};
