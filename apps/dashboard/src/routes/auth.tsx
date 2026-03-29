import { RedirectToSignIn, SignedIn, SignedOut } from '@clerk/clerk-react';
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
  return (
    <>
      <SignedIn>
        <AuthLayout>
          <Outlet />
        </AuthLayout>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};
