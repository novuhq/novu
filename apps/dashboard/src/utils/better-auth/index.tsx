import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';
import { authClient } from './client';
import {
  OrganizationList as OrganizationListComponent,
  OrganizationSwitcher as OrganizationSwitcherComponent,
  SignIn as SignInComponent,
  SignUp as SignUpComponent,
  UserButton as UserButtonComponent,
} from './components';

type BetterAuthUser = {
  id: string;
  email: string;
  name: string;
  image?: string;
  emailVerified: boolean;
};

type BetterAuthOrganization = {
  id: string;
  name: string;
  slug: string;
};

type BetterAuthSession = {
  user: BetterAuthUser;
  organization?: BetterAuthOrganization;
};

type AuthContextType = {
  user: BetterAuthUser | null;
  organization: BetterAuthOrganization | null;
  isLoaded: boolean;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<BetterAuthSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data } = await authClient.getSession();

        if (data?.user) {
          let organization: BetterAuthOrganization | undefined;

          if (data.session?.activeOrganizationId) {
            const { data: orgsData } = await authClient.organization.list();
            const activeOrg = orgsData?.find((org: any) => org.id === data.session?.activeOrganizationId);

            if (activeOrg) {
              organization = {
                id: activeOrg.id,
                name: activeOrg.name,
                slug: activeOrg.slug,
              };
            }
          }

          setSession({
            user: {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              image: data.user.image || undefined,
              emailVerified: data.user.emailVerified,
            },
            organization,
          });
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchSession();
  }, []);

  const signOut = async () => {
    await authClient.signOut();
    localStorage.removeItem('better-auth-session-token');
    setSession(null);
    window.location.href = ROUTES.SIGN_IN;
  };

  const getToken = async () => {
    return localStorage.getItem('better-auth-session-token');
  };

  const value = useMemo(
    () => ({
      user: session?.user || null,
      organization: session?.organization || null,
      isLoaded,
      signOut,
      getToken,
    }),
    [session, isLoaded]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within ClerkProvider');
  }

  return {
    isLoaded: context.isLoaded,
    isSignedIn: !!context.user,
    userId: context.user?.id,
    orgId: context.organization?.id,
    signOut: context.signOut,
  };
}

export function useUser() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useUser must be used within ClerkProvider');
  }

  return {
    user: context.user
      ? {
          id: context.user.id,
          externalId: context.user.id,
          emailAddresses: [{ emailAddress: context.user.email }],
          primaryEmailAddress: { emailAddress: context.user.email },
          fullName: context.user.name,
          imageUrl: context.user.image,
          firstName: context.user.name.split(' ')[0],
          lastName: context.user.name.split(' ').slice(1).join(' ') || undefined,
          createdAt: new Date(),
          passwordEnabled: true,
          publicMetadata: {},
          unsafeMetadata: {
            newDashboardOptInStatus: 'opted_in',
          },
          update: async (data: any) => {
            console.log('Better Auth: user.update() called with:', data);
            return Promise.resolve();
          },
        }
      : null,
    isLoaded: context.isLoaded,
  };
}

export function useOrganization() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useOrganization must be used within ClerkProvider');
  }

  return {
    organization: context.organization
      ? {
          id: context.organization.id,
          name: context.organization.name,
          slug: context.organization.slug,
          createdAt: new Date(),
          updatedAt: new Date(),
          publicMetadata: {
            externalOrgId: context.organization.id,
          },
        }
      : null,
    isLoaded: context.isLoaded,
  };
}

export function useOrganizationList(options?: { userMemberships?: { infinite?: boolean; pageSize?: number } }) {
  const { organization: currentOrganization, isLoaded: orgLoaded } = useOrganization();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const revalidate = useCallback(async () => {
    try {
      const { data } = await authClient.organization.list();
      setOrganizations(data || []);
      setHasLoaded(true);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orgLoaded) {
      revalidate();
    }
  }, [orgLoaded, revalidate]);

  const userMemberships = useMemo(() => {
    return organizations.map((org) => ({
      id: org.id,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        imageUrl: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        publicMetadata: {
          externalOrgId: org.id,
        },
      },
    }));
  }, [organizations]);

  const setActive = async ({ organization }: { organization: string }) => {
    try {
      await authClient.organization.setActive({
        organizationId: organization,
      });
      window.location.reload();
    } catch (error) {
      console.error('Failed to set active organization:', error);
      throw error;
    }
  };

  return {
    isLoaded: hasLoaded && orgLoaded,
    userMemberships: {
      data: userMemberships,
      revalidate,
      isFetching: isLoading,
      hasNextPage: false,
      fetchNext: undefined,
    },
    setActive,
  };
}

export function useClerk() {
  const context = useContext(AuthContext);

  return {
    setActive: async () => {},
    session: {
      getToken: () => context?.getToken() || Promise.resolve(null),
    },
  };
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return null;
  if (!user) return null;

  return <>{children}</>;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return null;
  if (user) return null;

  return <>{children}</>;
}

export function RedirectToSignIn() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(ROUTES.SIGN_IN);
  }, [navigate]);

  return null;
}

export function SignIn() {
  return <SignInComponent />;
}

export function SignUp() {
  return <SignUpComponent />;
}

export function UserButton() {
  return <UserButtonComponent />;
}

export function UserProfile() {
  return <div>Better Auth User Profile</div>;
}

export function OrganizationSwitcher() {
  return <OrganizationSwitcherComponent />;
}

export function OrganizationList() {
  return <OrganizationListComponent />;
}

export function OrganizationProfile() {
  return <div>Better Auth Organization Profile</div>;
}

export function Protect({ children }: { children: React.ReactNode; [key: string]: any }) {
  return <>{children}</>;
}

if (typeof window !== 'undefined') {
  (window as any).Clerk = {
    session: {
      getToken: async () => {
        return localStorage.getItem('better-auth-session-token');
      },
    },
  };
}
