import { RedirectToSignIn, Show, useAuth } from '@clerk/react';
import { useLocation } from 'react-router-dom';
import { AnimatedOutlet } from '@/components/animated-outlet';
import { AuthLayout } from '../components/auth-layout';
import { EnvironmentProvider } from '../context/environment/environment-provider';
import { ROUTES } from '../utils/routes';

export const OnboardingParentRoute = () => {
  const { isLoaded } = useAuth();
  const location = useLocation();
  const signedOutRedirectUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${ROUTES.ROOT}${location.search}${location.hash}`
      : undefined;

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
        <RedirectToSignIn redirectUrl={signedOutRedirectUrl} />
      </Show>
    </>
  );
};
