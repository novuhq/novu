import { useCallback, useEffect, useMemo, useState } from 'react';
import { type AuthContextValue } from '../../../components/providers/AuthProvider';
import type { IOrganizationEntity, IUserEntity } from '@novu/shared';
import { useAuth, useUser, useOrganization, useOrganizationList } from '@clerk/clerk-react';
import { OrganizationResource, UserResource } from '@clerk/types';

import { ROUTES } from '../../../constants/routes';
import { useCommonAuth } from '../../../hooks/useCommonAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createContextAndHook } from '../../../components/providers/createContextAndHook';

const asyncNoop = async () => {};

export const [EnterpriseAuthCtx] = createContextAndHook<AuthContextValue>('Enterprise Auth Context');

export const EnterpriseAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { signOut, orgId } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { organization: clerkOrganization, isLoaded: isOrganizationLoaded } = useOrganization();
  const {
    setActive,
    isLoaded: isOrgListLoaded,
    userMemberships,
  } = useOrganizationList({ userMemberships: { infinite: true } });

  const [user, setUser] = useState<IUserEntity | undefined>(undefined);
  const [organization, setOrganization] = useState<IOrganizationEntity | undefined>(undefined);

  const { inPublicRoute, inPrivateRoute, logout, redirectToLogin, redirectToSignUp } = useCommonAuth({
    user,
    organization,
    logoutCallback: async () => signOut(),
  });

  const switchOrgCallback = useCallback(async () => {
    await queryClient.refetchQueries();
  }, [queryClient]);

  const organizations = useMemo(() => {
    if (userMemberships && userMemberships.data) {
      return userMemberships.data.map((membership) => toOrganizationEntity(membership.organization));
    }

    return [];
  }, [userMemberships]);

  const reloadOrganization = useCallback(async () => {
    if (clerkOrganization) {
      await clerkOrganization.reload();
      setOrganization(toOrganizationEntity(clerkOrganization));
    }
  }, [clerkOrganization]);

  // check if user has active organization
  useEffect(() => {
    if (!orgId && isOrgListLoaded && clerkUser) {
      const hasOrgs = clerkUser.organizationMemberships.length > 0;

      if (hasOrgs) {
        const firstOrg = clerkUser.organizationMemberships[0].organization;
        setActive({ organization: firstOrg });
      } else {
        navigate(ROUTES.AUTH_SIGNUP_ORGANIZATION_LIST);
      }
    }
  }, [navigate, setActive, isOrgListLoaded, clerkUser, orgId]);

  // transform Clerk user to internal user entity
  useEffect(() => {
    if (isUserLoaded && clerkUser) {
      setUser(toUserEntity(clerkUser));
    }
  }, [clerkUser, isUserLoaded]);

  // transform Clerk organization to internal organization entity
  useEffect(() => {
    if (isOrganizationLoaded && clerkOrganization) {
      setOrganization(toOrganizationEntity(clerkOrganization));
    }
  }, [clerkOrganization, isOrganizationLoaded]);

  // refetch queries on organization switch
  useEffect(() => {
    // if linked, externalOrgId = internal org ObjectID, which is required on backend
    const isInternalOrgLinked = !!clerkOrganization?.publicMetadata.externalOrgId;
    const isOrgChanged = organization && organization._id !== clerkOrganization?.id;

    if (isInternalOrgLinked && isOrgChanged) {
      switchOrgCallback();
    }
  }, [organization, clerkOrganization, switchOrgCallback]);

  const value = {
    inPublicRoute,
    inPrivateRoute,
    isLoading: inPrivateRoute && (!isUserLoaded || !isOrganizationLoaded),
    currentUser: user,
    organizations,
    currentOrganization: organization,
    logout,
    login: asyncNoop,
    redirectToLogin,
    redirectToSignUp,
    switchOrganization: asyncNoop,
    reloadOrganization,
  };

  return <EnterpriseAuthCtx.Provider value={{ value }}>{children}</EnterpriseAuthCtx.Provider>;
};

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
