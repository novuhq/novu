import { Show, useAuth } from '@clerk/react';
import { Navigate, useLocation } from 'react-router-dom';
import { AnimatedOutlet } from '@/components/animated-outlet';
import { appendRedirectUrlParam } from '@/utils/cli-auth-pending';
import { ROUTES } from '@/utils/routes';
import { AuthLayout } from '../components/auth-layout';
import { EnvironmentProvider } from '../context/environment/environment-provider';

function OnboardingSignedOutRedirect() {
  const location = useLocation();
  const returnUrl = `${location.pathname}${location.search}${location.hash}`;
  const landingUrl = appendRedirectUrlParam(`${ROUTES.LANDING_1_SIGN_UP}${location.search}`, returnUrl);
  const { pathname, search } = new URL(landingUrl, window.location.origin);

  return <Navigate to={`${pathname}${search}`} replace />;
}

export const OnboardingParentRoute = () => {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return null;
  }

  return (
    <>
      <Show when="signed-in">
        <EnvironmentProvider>
          <AuthLayout>
            <AnimatedOutlet />
          </AuthLayout>
        </EnvironmentProvider>
      </Show>
      <Show when="signed-out">
        <OnboardingSignedOutRedirect />
      </Show>
    </>
  );
};
