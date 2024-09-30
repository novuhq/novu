import { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth, useOrganization, useOrganizationList, useUser } from '@clerk/clerk-react';
import type { UserResource } from '@clerk/types';
import { ROUTES } from '@/utils/routes';
import type { AuthContextValue } from './types';
import { toOrganizationEntity, toUserEntity } from './mappers';
import { AuthContext } from './auth-context';

const asyncNoop = async () => {};
const noop = () => {};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { orgId } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { organization: clerkOrganization, isLoaded: isOrganizationLoaded } = useOrganization();
  // TODO @ChmaraX: Can we use setActive from useSession, useSignIn, or useSignUp to avoid loading the list?
  const { setActive, isLoaded: isOrgListLoaded } = useOrganizationList({ userMemberships: { infinite: true } });
  const queryClient = useQueryClient();

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
    ({ redirectURL }: { redirectURL?: string } = {}) => redirectTo({ url: ROUTES.AUTH_SIGN_IN, redirectURL }),
    [redirectTo]
  );

  const redirectToSignUp = useCallback(
    ({ redirectURL, origin, anonymousId }: { redirectURL?: string; origin?: string; anonymousId?: string } = {}) =>
      redirectTo({ url: ROUTES.AUTH_SIGN_UP, redirectURL, origin, anonymousId }),
    [redirectTo]
  );

  const switchOrgCallback = useCallback(async () => {
    await queryClient.refetchQueries();
  }, [queryClient]);

  const reloadOrganization = useCallback(async () => {
    if (clerkOrganization) {
      await clerkOrganization.reload();
    }
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

  const currentUser = useMemo(() => (clerkUser ? toUserEntity(clerkUser as UserResource) : undefined), [clerkUser]);
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

  const value = useMemo(
    () =>
      ({
        isUserLoaded,
        isOrganizationLoaded,
        currentUser,
        currentOrganization,
        logout: noop,
        login: asyncNoop,
        redirectToLogin,
        redirectToSignUp,
        switchOrganization: asyncNoop,
        reloadOrganization,
      }) as AuthContextValue,
    [
      isUserLoaded,
      isOrganizationLoaded,
      currentUser,
      currentOrganization,
      redirectToLogin,
      redirectToSignUp,
      reloadOrganization,
    ]
  );
  /*
   * The 'as AuthContextValue' is necessary as Boolean and true or false discriminating unions
   * don't work with inference. See here https://github.com/microsoft/TypeScript/issues/19360
   *
   * Alternatively, we will have to conditionally generate the value object based on the isLoaded values.
   */

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
