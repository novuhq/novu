import { Show } from '@clerk/react';
import { AnimatedOutlet } from '@/components/animated-outlet';
import { ConnectSubscriberProvider } from '@/components/connect/connect-subscriber-provider';
import { AuthLayout } from '../components/auth-layout';
import { EnvironmentProvider } from '../context/environment/environment-provider';

export const OnboardingParentRoute = () => {
  return (
    <Show when="signed-in">
      <EnvironmentProvider>
        <ConnectSubscriberProvider>
          <AuthLayout>
            <AnimatedOutlet />
          </AuthLayout>
        </ConnectSubscriberProvider>
      </EnvironmentProvider>
    </Show>
  );
};
