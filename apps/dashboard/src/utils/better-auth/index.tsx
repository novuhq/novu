import { MemberRoleEnum, PermissionsEnum } from '@novu/shared';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';
import { EE_AUTH_PROVIDER, IS_SELF_HOSTED } from '../../config';
import { authClient } from './client';
import {
  ForgotPassword as ForgotPasswordComponent,
  InvitationAccept as InvitationAcceptComponent,
  OrganizationCreate as OrganizationCreateComponent,
  OrganizationList as OrganizationListComponent,
  OrganizationSwitcher as OrganizationSwitcherComponent,
  ResetPassword as ResetPasswordComponent,
  SignIn as SignInComponent,
  SignUp as SignUpComponent,
  SSOSignIn as SSOSignInComponent,
  TeamMembers as TeamMembersComponent,
  UserButton as UserButtonComponent,
  UserProfile as UserProfileComponent,
  VerifyEmail as VerifyEmailComponent,
} from './components';
import { ROLE_PERMISSIONS } from './role-permissions';

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

type AuthContextType = {
  user: BetterAuthUser | null;
  organization: BetterAuthOrganization | null;
  memberRole: MemberRoleEnum | null;
  isLoaded: boolean;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshSession: () => Promise<void>;
  has: (params: { permission: PermissionsEnum } | { role: MemberRoleEnum }) => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function ClerkProvider({ children }: { children: React.ReactNode }) {
  const { data: sessionData, isPending, refetch } = authClient.useSession();
  const [organization, setOrganization] = useState<BetterAuthOrganization | undefined>(undefined);
  const [memberRole, setMemberRole] = useState<MemberRoleEnum | null>(null);

  const activeOrganizationId = sessionData?.session?.activeOrganizationId;
  const currentUserId = sessionData?.user?.id;

  const isOrgLoading = !!activeOrganizationId && !organization;

  useEffect(() => {
    const fetchOrganization = async () => {
      if (activeOrganizationId && currentUserId) {
        try {
          const { data: fullOrgData } = await authClient.organization.getFullOrganization({
            query: {
              organizationId: activeOrganizationId,
            },
          });

          if (fullOrgData) {
            setOrganization({
              id: fullOrgData.id,
              name: fullOrgData.name,
              slug: fullOrgData.slug,
            });

            const currentMember = (fullOrgData as any).members?.find((member: any) => member.userId === currentUserId);
            if (currentMember?.role) {
              setMemberRole(currentMember.role as MemberRoleEnum);
            } else {
              setMemberRole(null);
            }
          } else {
            setOrganization(undefined);
            setMemberRole(null);
          }
        } catch (error) {
          console.error('Failed to fetch organization:', error);
          setOrganization(undefined);
          setMemberRole(null);
        }
      } else {
        setOrganization(undefined);
        setMemberRole(null);
      }
    };

    fetchOrganization();
  }, [activeOrganizationId, currentUserId]);

  const refreshSession = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    localStorage.removeItem('better-auth-session-token');
    window.location.href = ROUTES.SIGN_IN;
  }, []);

  const getToken = useCallback(async () => {
    return localStorage.getItem('better-auth-session-token');
  }, []);

  const user: BetterAuthUser | null = sessionData?.user
    ? {
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.name,
        image: sessionData.user.image || undefined,
        emailVerified: sessionData.user.emailVerified,
      }
    : null;

  const has = useCallback(
    (params: { permission: PermissionsEnum } | { role: MemberRoleEnum }) => {
      if (!memberRole) return false;

      if ('permission' in params) {
        const userPermissions = ROLE_PERMISSIONS[memberRole] || [];

        return userPermissions.includes(params.permission);
      }

      if ('role' in params) {
        return memberRole === params.role;
      }

      return false;
    },
    [memberRole]
  );

  const value = useMemo(
    () => ({
      user,
      organization: organization || null,
      memberRole,
      isLoaded: !isPending && !isOrgLoading,
      signOut,
      getToken,
      refreshSession,
      has,
    }),
    [user, organization, memberRole, isPending, isOrgLoading, refreshSession, signOut, getToken, has]
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
    refreshSession: context.refreshSession,
    has: context.has,
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
            return Promise.resolve();
          },
          reload: async () => {
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
          reload: async () => {
            return Promise.resolve();
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
    setActive: async ({ organization }: { organization?: string }) => {
      if (organization) {
        await authClient.organization.setActive({
          organizationId: organization,
        });
        window.location.reload();
      }
    },
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

export function ForgotPassword() {
  return <ForgotPasswordComponent />;
}

export function ResetPassword() {
  return <ResetPasswordComponent />;
}

export function SSOSignIn() {
  return <SSOSignInComponent />;
}

export function VerifyEmail() {
  return <VerifyEmailComponent />;
}

export function UserButton() {
  return <UserButtonComponent />;
}

export function UserProfile({ appearance, children }: { appearance?: any; children?: React.ReactNode }) {
  return <UserProfileComponent appearance={appearance}>{children}</UserProfileComponent>;
}

UserProfile.Page = UserProfileComponent.Page;

export function OrganizationSwitcher() {
  return <OrganizationSwitcherComponent />;
}

export function OrganizationList(props?: {
  appearance?: any;
  hidePersonal?: boolean;
  skipInvitationScreen?: boolean;
  afterSelectOrganizationUrl?: string;
  afterCreateOrganizationUrl?: string;
}) {
  return (
    <OrganizationCreateComponent
      afterSelectOrganizationUrl={props?.afterSelectOrganizationUrl || ROUTES.ENV}
      afterCreateOrganizationUrl={props?.afterCreateOrganizationUrl || ROUTES.INBOX_USECASE}
    />
  );
}

export function OrganizationProfile({ appearance, children }: { appearance?: any; children?: React.ReactNode }) {
  return <TeamMembersComponent appearance={appearance} />;
}

OrganizationProfile.Page = function Page({ label }: { label: string }) {
  return null;
};

export function InvitationAccept() {
  return <InvitationAcceptComponent />;
}

type ProtectProps = {
  children: React.ReactNode;
  permission?: PermissionsEnum;
  role?: MemberRoleEnum;
  condition?: (has: (params: { permission: PermissionsEnum } | { role: MemberRoleEnum }) => boolean) => boolean;
  fallback?: React.ReactNode;
};

export function Protect({ children, permission, role, condition, fallback }: ProtectProps) {
  const { has, isLoaded } = useAuth();

  if (!isLoaded) {
    return null;
  }

  let hasAccess = true;

  if (permission) {
    hasAccess = has({ permission });
  } else if (role) {
    hasAccess = has({ role });
  } else if (condition) {
    hasAccess = condition(has);
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

export async function refreshBetterAuthSession(): Promise<boolean> {
  try {
    const { data } = await authClient.getSession();

    return !!data?.user;
  } catch {
    return false;
  }
}

if (typeof window !== 'undefined' && EE_AUTH_PROVIDER === 'better-auth') {
  (window as any).Clerk = {
    session: {
      getToken: async () => {
        return localStorage.getItem('better-auth-session-token');
      },
    },
  };
}
