import { RedirectToSignIn, Show, useAuth } from '@clerk/react';
import { AnimatedOutlet } from '@/components/animated-outlet';
import { AuthLayout } from '../components/auth-layout';
import { EnvironmentProvider } from '../context/environment/environment-provider';

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
        <RedirectToSignIn redirectUrl={typeof window !== 'undefined' ? window.location.href : undefined} />
      </Show>
    </>
  );
};
