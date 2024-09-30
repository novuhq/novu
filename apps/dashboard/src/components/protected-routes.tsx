import { Navigate, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { EnvironmentProvider } from '@/context';
import { ROUTES } from '@/utils/routes';

export const ProtectedRoutes = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  if (pathname === '/') {
    return <Navigate to={ROUTES.WORKFLOWS} replace />;
  }

  return (
    <>
      <SignedIn>
        <EnvironmentProvider>{children}</EnvironmentProvider>
      </SignedIn>
      <SignedOut>
        <Navigate to={ROUTES.AUTH_SIGN_IN} replace />
      </SignedOut>
    </>
  );
};
