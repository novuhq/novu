import { Show } from '@clerk/react';
import { AnimatedOutlet } from '@/components/animated-outlet';
import { AuthLayout } from '../components/auth-layout';
import { EnvironmentProvider } from '../context/environment/environment-provider';

export const OnboardingParentRoute = () => {
  return (
    <Show when="signed-in">
      <EnvironmentProvider>
        <AuthLayout>
          <AnimatedOutlet />
        </AuthLayout>
      </EnvironmentProvider>
    </Show>
  );
};
