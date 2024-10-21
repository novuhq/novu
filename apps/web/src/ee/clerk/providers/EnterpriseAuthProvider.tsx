import { createContext, useCallback, useEffect, useState, useMemo } from 'react';
import type { IOrganizationEntity, IUserEntity, ProductUseCases } from '@novu/shared';
import { useAuth, useUser, useOrganization, useOrganizationList } from '@clerk/clerk-react';
import { OrganizationResource, UserResource } from '@clerk/types';

import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type AuthContextValue } from '../../../components/providers/AuthProvider';
import { DEFAULT_AUTH_CONTEXT_VALUE } from '../../../components/providers/constants';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { ROUTES } from '../../../constants/routes';

const asyncNoop = async () => {};

// TODO: Replace with createContextAndHook
export const EnterpriseAuthContext = createContext<AuthContextValue>(DEFAULT_AUTH_CONTEXT_VALUE);
EnterpriseAuthContext.displayName = 'EnterpriseAuthProvider';

export const EnterpriseAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { signOut, orgId } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { organization: clerkOrganization, isLoaded: isOrganizationLoaded } = useOrganization();
  // TODO @ChmaraX: Can we use setActive from useSession, useSignIn, or useSignUp to avoid loading the list?
  const { setActive, isLoaded: isOrgListLoaded } = useOrganizationList({ userMemberships: { infinite: true } });

  const segment = useSegment();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const logout = useCallback(() => {
    queryClient.clear();
    segment.reset();
    navigate(ROUTES.AUTH_LOGIN);
    signOut();
  }, [navigate, queryClient, segment, signOut]);

  // TODO @ChmaraX: Enhance Clerk redirect methods with our own logic
  const redirectTo = useCallback(
    ({
      url,
      redirectURL,
      origin,
      anonymousId,
    }: {
      url: string;
      redirectURL?: string;
      origin?: string;
      anonymousId?: string | null;
    }) => {
      const finalURL = new URL(url, window.location.origin);

      if (redirectURL) {
        finalURL.searchParams.append('redirect_url', redirectURL);
      }

      if (origin) {
        finalURL.searchParams.append('origin', origin);
      }

      if (anonymousId) {
        finalURL.searchParams.append('anonymous_id', anonymousId);
      }

      // Note: Do not use react-router-dom. The version we have doesn't do instant cross origin redirects.
      window.location.replace(finalURL.href);
    },
    []
  );

  const redirectToLogin = useCallback(
    ({ redirectURL }: { redirectURL?: string } = {}) => redirectTo({ url: ROUTES.AUTH_LOGIN, redirectURL }),
    [redirectTo]
  );

  const redirectToSignUp = useCallback(
    ({ redirectURL, origin, anonymousId }: { redirectURL?: string; origin?: string; anonymousId?: string } = {}) =>
      redirectTo({ url: ROUTES.AUTH_SIGNUP, redirectURL, origin, anonymousId }),
    [redirectTo]
  );

  const switchOrgCallback = useCallback(async () => {
    await queryClient.refetchQueries();
  }, [queryClient]);

  const reloadOrganization = useCallback(async () => {
    if (clerkOrganization) {
      await clerkOrganization.reload();
    }

    return {};
  }, [clerkOrganization]);

  // check if user has active organization
  useEffect(() => {
    if (orgId) {
      return;
    }

    if (isOrgListLoaded && clerkUser) {
      const hasOrgs = clerkUser.organizationMemberships.length > 0;

      if (hasOrgs) {
        const firstOrg = clerkUser.organizationMemberships[0].organization;
        setActive({ organization: firstOrg });
      } else if (!window.location.href.includes(ROUTES.AUTH_SIGNUP_ORGANIZATION_LIST)) {
        redirectTo({ url: ROUTES.AUTH_SIGNUP_ORGANIZATION_LIST });
      }
    }
  }, [setActive, isOrgListLoaded, clerkUser, orgId, redirectTo]);

  const currentUser = useMemo(() => (clerkUser ? toUserEntity(clerkUser) : undefined), [clerkUser]);
  const currentOrganization = useMemo(
    () => (clerkOrganization ? toOrganizationEntity(clerkOrganization) : undefined),
    [clerkOrganization]
  );

  // refetch queries on organization switch
  useEffect(() => {
    // if linked, externalOrgId = internal org ObjectID, which is required on backend
    const isInternalOrgLinked = !!clerkOrganization?.publicMetadata.externalOrgId;
    const isOrgChanged =
      currentOrganization && currentOrganization._id !== clerkOrganization?.publicMetadata.externalOrgId;

    if (isInternalOrgLinked && isOrgChanged) {
      switchOrgCallback();
    }
  }, [currentOrganization, clerkOrganization, switchOrgCallback]);

  const value = {
    isUserLoaded,
    isOrganizationLoaded,
    currentUser,
    currentOrganization,
    logout,
    login: asyncNoop,
    redirectToLogin,
    redirectToSignUp,
    switchOrganization: asyncNoop,
    reloadOrganization,
  } as AuthContextValue;
  /*
   * The 'as AuthContextValue' is necessary as Boolean and true or false discriminating unions
   * don't work with inference. See here https://github.com/microsoft/TypeScript/issues/19360
   *
   * Alternatively, we will have to conditionally generate the value object based on the isLoaded values.
   */

  return <EnterpriseAuthContext.Provider value={value}>{children}</EnterpriseAuthContext.Provider>;
};

const toUserEntity = (clerkUser: UserResource): IUserEntity => {
  /*
   * When mapping to IUserEntity, we have 2 cases:
   *  - user exists and has signed in
   *  - user is signing up
   *
   * In the case where the user is still signing up, we are using the clerk identifier for the id.
   * This however quickly gets update to the externalId (which is actually the novu internal
   * entity identifier) that gets used further in the app. There are a few consumers that
   * want to use this identifier before it is set to the internal value. These consumers
   * should make sure they only report with the correct value, a reference
   * implementation can be found in 'apps/web/src/hooks/useMonitoring.ts'
   */

  return {
    _id: clerkUser.externalId ?? clerkUser.id,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    email: clerkUser.emailAddresses[0].emailAddress,
    profilePicture: clerkUser.imageUrl,
    createdAt: clerkUser.createdAt?.toISOString() ?? '',
    showOnBoarding: clerkUser.publicMetadata.showOnBoarding,
    showOnBoardingTour: clerkUser.publicMetadata.showOnBoardingTour,
    servicesHashes: clerkUser.publicMetadata.servicesHashes,
    jobTitle: clerkUser.publicMetadata.jobTitle,
    hasPassword: clerkUser.passwordEnabled,
  };
};

const toOrganizationEntity = (clerkOrganization: OrganizationResource): IOrganizationEntity => {
  /*
   * When mapping to IOrganizationEntity, we have 2 cases:
   *  - user exists and has signed in
   *  - user is signing up
   *
   *
   * In the case where the user is still signing up, we are using the clerk identifier for the id.
   * This however quickly gets update to the externalId (which is actually the novu internal
   * entity identifier) that gets used further in the app. There are a few consumers that
   * want to use this identifier before it is set to the internal value. These consumers
   * should make sure they only report with the correct value, a reference
   * implementation can be found in 'apps/web/src/hooks/useMonitoring.ts'
   */

  return {
    _id: clerkOrganization.publicMetadata.externalOrgId ?? clerkOrganization.id,
    name: clerkOrganization.name,
    createdAt: clerkOrganization.createdAt.toISOString(),
    updatedAt: clerkOrganization.updatedAt.toISOString(),
    domain: clerkOrganization.publicMetadata.domain,
    productUseCases: clerkOrganization.publicMetadata.productUseCases,
    language: clerkOrganization.publicMetadata.language,
  };
};
