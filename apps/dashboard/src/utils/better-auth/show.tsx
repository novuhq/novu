import type { ShowWhenCondition } from '@clerk/shared/types';
import { MemberRoleEnum, PermissionsEnum } from '@novu/shared';
import React, { useContext } from 'react';
import { AuthContext } from './auth-context';

type ShowProps = {
  when: ShowWhenCondition;
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

function evaluateShowCondition(
  when: ShowWhenCondition,
  has: (params: { permission: PermissionsEnum } | { role: MemberRoleEnum }) => boolean,
  isSignedIn: boolean
): boolean {
  if (when === 'signed-in') {
    return isSignedIn;
  }

  if (when === 'signed-out') {
    return !isSignedIn;
  }

  if (typeof when === 'function') {
    return when(has);
  }

  if ('permission' in when) {
    return has({ permission: when.permission });
  }

  if ('role' in when) {
    return has({ role: when.role });
  }

  return false;
}

export function Show({ when, fallback, children }: ShowProps) {
  const context = useContext(AuthContext);

  if (!context?.isLoaded) {
    return null;
  }

  const isSignedIn = !!context.user;
  const shouldShow = evaluateShowCondition(when, context.has, isSignedIn);

  if (!shouldShow) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
