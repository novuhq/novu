import { Navigate, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { EnvironmentProvider } from '@/context';
import { ROUTES } from '@/utils/routes';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  if (pathname === ROUTES.ROOT) {
    return <Navigate to={ROUTES.WORKFLOWS} replace />;
  }

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
