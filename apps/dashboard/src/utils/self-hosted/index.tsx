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
import { OrganizationSwitcher } from './organization-switcher';
import { OrganizationContextProvider, useOrganization } from './organization.resource';
import { UserButton } from './user-button';
import { UserContextProvider, useUser } from './user.resource';

export {
  AuthContextProvider, OrganizationContextProvider, OrganizationList,
  OrganizationProfile, OrganizationSwitcher, RedirectToSignIn,
  SignedIn,
  SignedOut, SignIn,
  SignUp, UserButton, UserProfile
};

  export { useAuth, useOrganization, useUser };

export const useClerk = () => {
  return {
    setActive: async () => {
      console.warn('Clerk.setActive is not available in self-hosted mode');
    },
  };
};

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

export type ProtectProps = {
  children: React.ReactNode;
  [key: string]: any;
};

export const Protect = ({ children, ...rest }: ProtectProps) => {
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
