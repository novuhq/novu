import { RedirectToSignIn, SignedIn, SignedOut } from '@clerk/clerk-react';
import { EnvironmentProvider } from '@/context/environment/environment-provider';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <SignedIn>
        <EnvironmentProvider>{children}</EnvironmentProvider>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};
