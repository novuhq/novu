import React from 'react';
import { OrganizationSwitcher } from './organization-switcher';
import { UserButton } from './user-button';
import { OrganizationContextProvider, useOrganization } from './organization.resource';
import { UserContextProvider, useUser } from './user.resource';
import { AuthContextProvider, useAuth } from './auth.resource';
import { IOrganizationEntity } from '@novu/shared';
import { getJwtToken, isJwtValid } from './jwt-manager';

import {
  OrganizationList,
  OrganizationProfile,
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  SignIn,
  SignUp,
  UserProfile,
} from './components';

export {
  OrganizationSwitcher,
  UserButton,
  OrganizationContextProvider,
  AuthContextProvider,
  OrganizationList,
  OrganizationProfile,
  UserProfile,
  SignIn,
  SignUp,
  RedirectToSignIn,
  SignedIn,
  SignedOut,
};

// eslint-disable-next-line react-refresh/only-export-components
export { useOrganization, useUser, useAuth };

export const useOrganizationList = () => {
  const { organization, isLoaded } = useOrganization() as {
    organization: IOrganizationEntity;
    isLoaded: boolean;
  };

  return {
    isLoaded,
    organizationList: organization ? [organization] : [],
    setActive: async () => null,
  };
};

export const ClerkContext = React.createContext({});

export function ClerkProvider({ children }: any) {
  const value = {};

  return (
    <ClerkContext.Provider value={value}>
      <UserContextProvider>
        <AuthContextProvider>
          <OrganizationContextProvider>{children}</OrganizationContextProvider>
        </AuthContextProvider>
      </UserContextProvider>
    </ClerkContext.Provider>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).Clerk = {
  loggedIn: isJwtValid(getJwtToken()),
  session: {
    getToken: () => getJwtToken(),
  },
};

export type DecodedJwt = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  organizationId: string;
  environmentId: string | null;
  roles: string[];
  iat: number;
  exp: number;
  iss: string;
};
