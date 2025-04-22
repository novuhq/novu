import React from 'react';
import { createContextHook } from '../context';
import { DecodedJwt } from '.';
import { getJwtToken, isJwtValid } from './jwt-manager';

export const AuthContext = React.createContext({});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AuthContextProvider({ children }: any) {
  const jwt = getJwtToken();
  const decodedJwt: DecodedJwt | null = jwt && isJwtValid(jwt) ? JSON.parse(atob(jwt.split('.')[1])) : null;

  const value = {
    currentUser: {
      update: async () => null,
      externalId: decodedJwt?._id,
      firstName: decodedJwt?.firstName,
      emailAddresses: [{ emailAddress: decodedJwt?.email }],
      createdAt: new Date(),
      publicMetadata: { newDashboardOptInStatus: 'opted_in' },
      unsafeMetadata: { newDashboardOptInStatus: 'opted_in' },
      lastName: decodedJwt?.lastName,
      organizationMemberships: [{}],
      passwordEnabled: true,
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = createContextHook(AuthContext);
