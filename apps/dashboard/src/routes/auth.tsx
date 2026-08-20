import { RedirectToSignIn, Show, useAuth, useClerk } from '@clerk/react';
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthLayout } from '@/components/auth-layout';
import { RouteFallback } from '@/components/route-fallback';

export const AuthRoute = () => {
  return (
    <AuthLayout>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
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
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </AuthLayout>
      </Show>
      <Show when="signed-out">
        <RedirectToSignIn redirectUrl={typeof window !== 'undefined' ? window.location.href : undefined} />
      </Show>
    </>
  );
};
