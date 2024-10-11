import { Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { EnvironmentProvider } from '@/context';
import { ROUTES } from '@/utils/routes';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <SignedIn>
        <EnvironmentProvider>{children}</EnvironmentProvider>
      </SignedIn>
      <SignedOut>
        <Navigate to={ROUTES.SIGN_IN} replace />
      </SignedOut>
    </>
  );
};
