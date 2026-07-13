import { MemberRoleEnum, PermissionsEnum } from '@novu/shared';
import React from 'react';
import { createContextHook } from '../context';
import { DecodedJwt } from '.';
import { getJwtToken, isJwtValid } from './jwt-manager';
import { createUserFromJwt, SelfHostedUser } from './user.types';

export type SelfHostedAuthContextValue = {
  currentUser: SelfHostedUser | null;
  has: (params: { permission: PermissionsEnum } | { role: MemberRoleEnum }) => boolean;
};

const defaultAuthContextValue: SelfHostedAuthContextValue = {
  currentUser: null,
  has: () => true,
};

export const AuthContext = React.createContext<SelfHostedAuthContextValue>(defaultAuthContextValue);

export function AuthContextProvider({ children }: any) {
  const jwt = getJwtToken();
  const decodedJwt: DecodedJwt | null = jwt && isJwtValid(jwt) ? JSON.parse(atob(jwt.split('.')[1])) : null;

  const value = {
    currentUser: createUserFromJwt(decodedJwt),
    has: () => true,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuthContext = createContextHook(AuthContext);
