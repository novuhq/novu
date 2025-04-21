import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../api/api.client';
import { Input } from '../components/primitives/input';
import { createContextHook } from './context';

export const AuthContext = React.createContext({});
export const useAuth = createContextHook(AuthContext);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AuthContextProvider({ children }: any) {
  const value = {
    currentUser: {
      update: async () => null,
      externalId: 1,
      createdAt: new Date(),
      firstName: 'Sap',
      publicMetadata: { newDashboardOptInStatus: 'opted_in' },
      unsafeMetadata: { newDashboardOptInStatus: 'opted_in' },
      lastName: 'saps',
      organizationMemberships: [{}],
      passwordEnabled: true,
      emailAddresses: [{ emailAddress: 'dd@novu.co' }],
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const OrganizationContext = React.createContext({});
export const useOrganization = createContextHook(OrganizationContext);

export const useOrganizationList = () => {
  return {
    isLoaded: true,
    organizationList: [
      {
        id: '1',
        name: 'Organization 1',
        slug: 'org-1',
        logoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publicMetadata: {},
        privateMetadata: {},
      },
      {
        id: '2',
        name: 'Organization 2',
        slug: 'org-2',
        logoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        publicMetadata: {},
        privateMetadata: {},
      },
    ],
    setActive: async () => null,
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function OrganizationContextProvider({ children }: any) {
  const value = {
    organization: {
      name: 'aaa',
      createdAt: new Date(),
      updatedAt: new Date(),
      externalOrgId: '1',
      publicMetadata: {
        externalOrgId: '123',
      },
      _id: '123124',
    },
    isLoaded: true,
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export const UserContext = React.createContext({});
export const useUser = createContextHook(UserContext);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function UserContextProvider({ children }: any) {
  const value = {
    user: {
      update: async () => null,
      externalId: 1,
      createdAt: new Date(),
      firstName: 'Sap',
      publicMetadata: { newDashboardOptInStatus: 'opted_in' },
      unsafeMetadata: { newDashboardOptInStatus: 'opted_in' },
      lastName: 'saps',

      organizationMemberships: [{}],
      passwordEnabled: true,
      emailAddresses: [{ emailAddress: 'dd@novu.co' }],
    },
    isLoaded: true,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

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

export function OrganizationSwitcher() {
  return <></>;
}

export function UserButton() {
  return <></>;
}

export function OrganizationList() {
  return <></>;
}

export function OrganizationProfile() {
  return <></>;
}

export function UserProfile() {
  return <></>;
}

export function SignIn() {
  const navigate = useNavigate();
  useEffect(() => {
    getJwt();
    navigate('/');
  });

  return <>{'Loading...'}</>;
}

export function SignUp() {
  return (
    <>
      <Input placeholder="Email" />
      <Input placeholder="Password" />
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SignedIn({ children }: { children: any }) {
  return <>{children}</>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SignedOut({ children }: { children: any }) {
  if ((window as any).Clerk.loggedIn) return null;

  return <>{children}</>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RedirectToSignIn({ children }: { children: any }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!(window as any).Clerk.loggedIn) {
      getJwt();
      navigate('/sign-in');
    }
  }, [navigate]);

  // if (!(window as any).Clerk.loggedIn) {
  //   console.log('RedirectToSignIn: return null');
  //   return null;
  // }

  return <>{children}</>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).Clerk = {
  loggedIn: !!localStorage.getItem('self-hosted-jwt'),
  session: {
    getToken: () => localStorage.getItem('self-hosted-jwt'),
  },
};

function getJwt() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get('/auth/self-hosted').then((result: any) => {
    localStorage.setItem('self-hosted-jwt', result?.data.token);
  });
}
