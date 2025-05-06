import { AnimatedOutlet } from '@/components/animated-outlet';
import { AuthLayout } from '../components/auth-layout';
import { SignedIn } from '@clerk/clerk-react';
import { EnvironmentProvider } from '../context/environment/environment-provider';

export const OnboardingParentRoute = () => {
  return (
    <SignedIn>
      <EnvironmentProvider>
        <AuthLayout>
          <AnimatedOutlet />
        </AuthLayout>
      </EnvironmentProvider>
    </SignedIn>
  );
};
