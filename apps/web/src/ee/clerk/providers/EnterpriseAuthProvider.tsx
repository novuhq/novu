import React, { createContext, useContext, useEffect, useCallback, useMemo, useState } from 'react';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import type { IOrganizationEntity, IUserEntity } from '@novu/shared';
import { useAuth, useUser, useOrganization, useOrganizationList } from '@clerk/clerk-react';
import { OrganizationResource, UserResource } from '@clerk/types';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { PUBLIC_ROUTES_PREFIXES, ROUTES } from '../../../constants/routes';
import { IS_EE_AUTH_ENABLED } from '../../../config/index';

interface AuthEnterpriseContextProps {
  inPublicRoute: boolean;
  inPrivateRoute: boolean;
  isLoading: boolean;
  currentUser: IUserEntity | undefined;
  organizations: IOrganizationEntity[];
  currentOrganization: IOrganizationEntity | undefined;
  login: (...args: any[]) => void;
  logout: () => void;
  environmentId: string | null;
}

const toUserEntity = (clerkUser: UserResource): IUserEntity => ({
  _id: clerkUser.id,
  firstName: clerkUser.firstName,
  lastName: clerkUser.lastName,
  email: clerkUser.emailAddresses[0].emailAddress,
  profilePicture: clerkUser.imageUrl,
  createdAt: clerkUser.createdAt?.toString() ?? '',
  showOnBoarding: clerkUser.publicMetadata.showOnBoarding,
  showOnBoardingTour: clerkUser.publicMetadata.showOnBoardingTour,
  servicesHashes: clerkUser.publicMetadata.servicesHashes,
  jobTitle: clerkUser.publicMetadata.jobTitle,
  hasPassword: clerkUser.passwordEnabled,
});

const toOrganizationEntity = (clerkOrganization: OrganizationResource): IOrganizationEntity => ({
  _id: clerkOrganization.id,
  name: clerkOrganization.name,
  createdAt: clerkOrganization.createdAt.toString(),
  updatedAt: clerkOrganization.updatedAt.toString(),
  apiServiceLevel: clerkOrganization.publicMetadata.apiServiceLevel,
  defaultLocale: clerkOrganization.publicMetadata.defaultLocale,
  domain: clerkOrganization.publicMetadata.domain,
  productUseCases: clerkOrganization.publicMetadata.productUseCases,
});

const AuthEnterpriseContext = createContext<AuthEnterpriseContextProps | undefined>(undefined);

export const useAuthEnterpriseContext = () => {
  const context = useContext(AuthEnterpriseContext);
  if (context === undefined) {
    throw new Error('useAuthEnterpriseContext must be used within an AuthEnterpriseProvider');
  }

  return context;
};

const _AuthEnterpriseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut, userId, orgId } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { organization: clerkOrganization, isLoaded: isOrganizationLoaded } = useOrganization();
  const { setActive, isLoaded: isOrgListLoaded } = useOrganizationList();

  const [user, setUser] = useState<IUserEntity | undefined>(undefined);
  const [organization, setOrganization] = useState<IOrganizationEntity | undefined>(undefined);

  const ldClient = useLDClient();
  const segment = useSegment();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const inPublicRoute = useMemo(
    () => Array.from(PUBLIC_ROUTES_PREFIXES.values()).some((prefix) => location.pathname.startsWith(prefix)),
    [location.pathname]
  );
  const inPrivateRoute = !inPublicRoute;

  const logout = useCallback(() => {
    queryClient.clear();
    segment.reset();
    navigate(ROUTES.AUTH_LOGIN);
    signOut();
  }, [navigate, queryClient, segment, signOut]);

  useEffect(() => {
    if (orgId || !userId) return;

    if (isOrgListLoaded && clerkUser) {
      const hasOrgs = clerkUser.organizationMemberships.length > 0;

      if (hasOrgs) {
        const firstOrg = clerkUser.organizationMemberships[0].organization;
        setActive({ organization: firstOrg });
      } else {
        navigate(ROUTES.AUTH_SIGNUP_ORGANIZATION_LIST);
      }
    }
  }, [navigate, setActive, isOrgListLoaded, clerkUser, orgId, userId]);

  useEffect(() => {
    if (isUserLoaded && clerkUser) {
      setUser(toUserEntity(clerkUser));
    }
  }, [clerkUser, isUserLoaded]);

  useEffect(() => {
    if (isOrganizationLoaded && clerkOrganization) {
      setOrganization(toOrganizationEntity(clerkOrganization));
    }
  }, [clerkOrganization, isOrganizationLoaded]);

  const switchOrgCallback = useCallback(async () => {
    await queryClient.refetchQueries();
  }, [queryClient]);

  useEffect(() => {
    if (organization && organization._id !== clerkOrganization?.id) {
      switchOrgCallback();
    }
  }, [organization, clerkOrganization, switchOrgCallback]);

  useEffect(() => {
    if (user && organization) {
      segment.identify(user);

      Sentry.setUser({
        email: user.email ?? '',
        username: `${user.firstName} ${user.lastName}`,
        id: user._id,
        organizationId: organization._id,
        organizationName: organization.name,
      });
    } else {
      Sentry.configureScope((scope) => scope.setUser(null));
    }
  }, [user, organization, segment]);

  useEffect(() => {
    if (!ldClient) return;

    if (organization) {
      ldClient.identify({
        kind: 'organization',
        key: organization._id,
        name: organization.name,
      });
    } else {
      ldClient.identify({
        kind: 'user',
        anonymous: true,
      });
    }
  }, [ldClient, organization]);

  const memoizedValues = useMemo(
    () => ({
      inPublicRoute,
      inPrivateRoute,
      isLoading: inPrivateRoute && (!isUserLoaded || !isOrganizationLoaded),
      currentUser: user,
      // TODO: (to decide) either remove/rework places where "organizations" is used or fetch from Clerk
      organizations: isOrganizationLoaded && organization ? [organization] : [],
      currentOrganization: organization,
      login: (...args: any[]) => console.warn('login() not implemented in enterprise version'),
      logout,
      // TODO: implement proper environment switch
      environmentId: null,
    }),
    [inPublicRoute, inPrivateRoute, isUserLoaded, isOrganizationLoaded, user, organization, logout]
  );

  if (!IS_EE_AUTH_ENABLED) {
    return <>{children}</>;
  }

  return <AuthEnterpriseContext.Provider value={memoizedValues}>{children}</AuthEnterpriseContext.Provider>;
};

export const AuthEnterpriseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!IS_EE_AUTH_ENABLED) {
    return <>{children}</>;
  }

  return <_AuthEnterpriseProvider>{children}</_AuthEnterpriseProvider>;
};
