import { IOrganizationEntity } from '@novu/shared';
import React from 'react';
import { AuthContextProvider, useAuth } from './auth.resource';
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
import { getJwtToken, isJwtValid } from './jwt-manager';
import { OrganizationContextProvider, useOrganization } from './organization.resource';
import { OrganizationSwitcher } from './organization-switcher';
import { UserContextProvider, useUser } from './user.resource';
import { UserButton } from './user-button';

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

export const Protect = ({ children, ...rest }: any) => {
  return children;
};

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
