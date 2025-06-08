import React from 'react';
import { createContextHook } from '../context';
import { DecodedJwt } from '.';
import { getJwtToken, isJwtValid } from './jwt-manager';
import { createUserFromJwt } from './user.types';

export const AuthContext = React.createContext({});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AuthContextProvider({ children }: any) {
  const jwt = getJwtToken();
  const decodedJwt: DecodedJwt | null = jwt && isJwtValid(jwt) ? JSON.parse(atob(jwt.split('.')[1])) : null;

  const value = {
    currentUser: createUserFromJwt(decodedJwt),
    has: () => true,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = createContextHook(AuthContext);
