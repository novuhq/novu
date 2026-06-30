import { Show, useAuth } from '@clerk/react';
import { Navigate, useLocation } from 'react-router-dom';
import { AnimatedOutlet } from '@/components/animated-outlet';
import { appendRedirectUrlParam } from '@/utils/cli-auth-pending';
import { AuthLayout } from '../components/auth-layout';
import { EnvironmentProvider } from '../context/environment/environment-provider';
import { ROUTES } from '../utils/routes';

function OnboardingSignedOutRedirect() {
  const location = useLocation();
  const dashboardDestination = `${ROUTES.ROOT}${location.search}${location.hash}`;
  const signInUrl = appendRedirectUrlParam(ROUTES.SIGN_IN, dashboardDestination);
  const { pathname, search } = new URL(signInUrl, window.location.origin);

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
