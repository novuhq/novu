import { RedirectToSignIn, SignedIn, SignedOut, useAuth } from '@clerk/clerk-react';
import { MemberRoleEnum, PermissionsEnum } from '@novu/shared';
import { ReactNode } from 'react';
import { EnvironmentProvider } from '@/context/environment/environment-provider';
import { PermissionProtectedRoute } from './permission-protected-route';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: PermissionsEnum;
  condition?: (has: (params: { permission: PermissionsEnum } | { role: MemberRoleEnum }) => boolean) => boolean;
  isDrawerRoute?: boolean;
}

export const ProtectedRoute = ({ children, permission, condition, isDrawerRoute }: ProtectedRouteProps) => {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return null;
  }

  return (
    <>
      <SignedIn>
        <EnvironmentProvider>
          {permission || condition ? (
            <PermissionProtectedRoute permission={permission} condition={condition} isDrawerRoute={isDrawerRoute}>
              {children}
            </PermissionProtectedRoute>
          ) : (
            children
          )}
        </EnvironmentProvider>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn redirectUrl={typeof window !== 'undefined' ? window.location.href : undefined} />
      </SignedOut>
    </>
  );
};
