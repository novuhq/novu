import { IOrganizationEntity } from '@novu/shared';
import React from 'react';
import { AuthContextProvider } from './auth.resource';
import { ClerkLoaded } from './clerk-loaded';
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
import { Show } from './show';
import { useAuth } from './use-auth';
import { UserContextProvider, useUser } from './user.resource';
import { UserButton } from './user-button';

export {
  AuthContextProvider,
  ClerkLoaded,
  OrganizationContextProvider,
  OrganizationList,
  OrganizationProfile,
  OrganizationSwitcher,
  RedirectToSignIn,
  Show,
  SignedIn,
  SignedOut,
  SignIn,
  SignUp,
  UserButton,
  UserProfile,
};

export { useAuth, useOrganization, useUser };

export const useClerk = () => {
  const { isLoaded } = useAuth();

  return {
    loaded: isLoaded,
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
