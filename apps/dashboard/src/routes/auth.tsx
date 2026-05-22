import { RedirectToSignIn, Show } from '@clerk/react';
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
      <Show when="signed-in">
        <AuthLayout>
          <Outlet />
        </AuthLayout>
      </Show>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
    </>
  );
};
