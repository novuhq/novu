import { RedirectToSignIn, Show } from '@clerk/react';
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
  return (
    <>
      <Show when="signed-in">
        <EnvironmentProvider>
          {permission || condition ? (
            <PermissionProtectedRoute permission={permission} condition={condition} isDrawerRoute={isDrawerRoute}>
              {children}
            </PermissionProtectedRoute>
          ) : (
            children
          )}
        </EnvironmentProvider>
      </Show>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
    </>
  );
};
