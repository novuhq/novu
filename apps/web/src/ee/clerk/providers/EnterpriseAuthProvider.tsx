import { useCallback, useEffect, useMemo, useState } from 'react';
import { type AuthContextValue } from '../../../components/providers/AuthProvider';
import type { IOrganizationEntity, IUserEntity } from '@novu/shared';
import { useAuth, useUser, useOrganization, useOrganizationList } from '@clerk/clerk-react';
import { OrganizationResource, UserResource } from '@clerk/types';

import { useCommonAuth } from '../../../hooks/useCommonAuth';
import { useQueryClient } from '@tanstack/react-query';
import { createContextAndHook } from '../../../components/providers/createContextAndHook';
import { withOrganizationGuard } from './withOrganizationGuard';

const asyncNoop = async () => {};

export const [EnterpriseAuthCtx] = createContextAndHook<AuthContextValue>('Enterprise Auth Context');

const EnterpriseAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();

  const { signOut } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { organization: clerkOrganization, isLoaded: isOrganizationLoaded } = useOrganization();
  const { userMemberships } = useOrganizationList({ userMemberships: { infinite: true } });

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

export default withOrganizationGuard(EnterpriseAuthProvider);

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
