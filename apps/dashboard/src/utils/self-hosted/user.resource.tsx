import React from 'react';
import { createContextHook } from '../context';
import { DecodedJwt } from '.';

export const UserContext = React.createContext({});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function UserContextProvider({ children }: any) {
  const jwt = localStorage.getItem('self-hosted-jwt');
  const decodedJwt: DecodedJwt | null = jwt ? JSON.parse(atob(jwt.split('.')[1])) : null;
  const value = {
    user: {
      update: async () => null,
      externalId: decodedJwt?._id,
      firstName: decodedJwt?.firstName,
      lastName: decodedJwt?.lastName,
      emailAddresses: [{ emailAddress: decodedJwt?.email }],
      createdAt: new Date(),
      publicMetadata: { newDashboardOptInStatus: 'opted_in' },
      unsafeMetadata: { newDashboardOptInStatus: 'opted_in' },
      organizationMemberships: [{}],
      passwordEnabled: true,
    },
    isLoaded: true,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useUser = createContextHook(UserContext);
