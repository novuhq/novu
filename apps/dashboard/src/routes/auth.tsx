import { RedirectToSignIn, SignedIn, SignedOut, useAuth, useClerk } from '@clerk/clerk-react';
import { Outlet } from 'react-router-dom';
import { AuthLayout } from '@/components/auth-layout';

export const AuthRoute = () => {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
};

export const ProtectedAuthRoute = () => {
  const { isLoaded } = useAuth();
  const clerk = useClerk();

  if (!isLoaded || !clerk.loaded) {
    return null;
  }

  return (
    <>
      <SignedIn>
        <AuthLayout>
          <Outlet />
        </AuthLayout>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn redirectUrl={typeof window !== 'undefined' ? window.location.href : undefined} />
      </SignedOut>
    </>
  );
};
