import { RedirectToSignIn, Show, useAuth, useClerk } from '@clerk/react';
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
      <Show when="signed-in">
        <AuthLayout>
          <Outlet />
        </AuthLayout>
      </Show>
      <Show when="signed-out">
        <RedirectToSignIn redirectUrl={typeof window !== 'undefined' ? window.location.href : undefined} />
      </Show>
    </>
  );
};
