import type { CheckAuthorizationWithCustomPermissions, ShowWhenCondition } from '@clerk/shared/types';
import { MemberRoleEnum, PermissionsEnum } from '@novu/shared';
import React, { useContext } from 'react';
import { AuthContext } from './auth-context';

type ShowProps = {
  when: ShowWhenCondition;
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

function toClerkHas(
  has: (params: { permission: PermissionsEnum } | { role: MemberRoleEnum }) => boolean
): CheckAuthorizationWithCustomPermissions {
  return (params) => {
    if ('permission' in params && params.permission !== undefined) {
      return has({ permission: params.permission as PermissionsEnum });
    }

    if ('role' in params && params.role !== undefined) {
      return has({ role: params.role as MemberRoleEnum });
    }

    return false;
  };
}

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
    return when(toClerkHas(has));
  }

  if ('permission' in when && when.permission !== undefined) {
    return has({ permission: when.permission as PermissionsEnum });
  }

  if ('role' in when && when.role !== undefined) {
    return has({ role: when.role as MemberRoleEnum });
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
