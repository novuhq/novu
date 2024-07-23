import { createContext, useCallback, useEffect, useState } from 'react';
import { DEFAULT_AUTH_CONTEXT_VALUE } from '../../../components/providers/constants';
import { type AuthContextValue } from '../../../components/providers/AuthProvider';
import type { IOrganizationEntity, IUserEntity } from '@novu/shared';
import { useAuth, useUser, useOrganization, useOrganizationList } from '@clerk/clerk-react';
import { OrganizationResource, UserResource } from '@clerk/types';

import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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

  const [user, setUser] = useState<IUserEntity | undefined>(undefined);
  // TODO @ChmaraX: Do we need this setState? Clerk state changes should be enough
  const [organization, setOrganization] = useState<IOrganizationEntity | undefined>(undefined);

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
      setOrganization(toOrganizationEntity(clerkOrganization));
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
    const isOrgChanged = organization && organization._id !== clerkOrganization?.publicMetadata.externalOrgId;

    if (isInternalOrgLinked && isOrgChanged) {
      switchOrgCallback();
    }
  }, [organization, clerkOrganization, switchOrgCallback]);

  const value = {
    isUserLoaded,
    isOrganizationLoaded,
    currentUser: user,
    currentOrganization: organization,
    logout,
    login: asyncNoop,
    redirectToLogin,
    redirectToSignUp,
    switchOrganization: asyncNoop,
    reloadOrganization,
  } as AuthContextValue;
  /*
   * The previous assestion is necessary as Boolean and true or false discriminating unions
   * don't work with inference. See here https://github.com/microsoft/TypeScript/issues/19360
   *
   * Alternatively, we will have to conditionally generate the value object based on the isLoaded values.
   */

  return <EnterpriseAuthContext.Provider value={value}>{children}</EnterpriseAuthContext.Provider>;
};

const toUserEntity = (clerkUser: UserResource): IUserEntity => {
  if (!clerkUser.externalId) {
    throw new Error('user externalId should exist');
  }

  return {
    _id: clerkUser.externalId,
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
  };
};

const toOrganizationEntity = (clerkOrganization: OrganizationResource): IOrganizationEntity => {
  if (!clerkOrganization.publicMetadata.externalOrgId) {
    throw new Error('user externalId should exist');
  }

  return {
    _id: clerkOrganization.publicMetadata.externalOrgId,
    name: clerkOrganization.name,
    createdAt: clerkOrganization.createdAt.toString(),
    updatedAt: clerkOrganization.updatedAt.toString(),
    apiServiceLevel: clerkOrganization.publicMetadata.apiServiceLevel,
    defaultLocale: clerkOrganization.publicMetadata.defaultLocale,
    domain: clerkOrganization.publicMetadata.domain,
    productUseCases: clerkOrganization.publicMetadata.productUseCases,
  };
};
