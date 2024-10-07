import { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useAuth, useOrganization, useOrganizationList, useUser } from '@clerk/clerk-react';
import type { UserResource } from '@clerk/types';
import { ROUTES } from '@/utils/routes';
import type { AuthContextValue } from './types';
import { toOrganizationEntity, toUserEntity } from './mappers';
import { AuthContext } from './auth-context';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { orgId } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { organization: clerkOrganization, isLoaded: isOrganizationLoaded } = useOrganization();
  const { setActive, isLoaded: isOrgListLoaded } = useOrganizationList({ userMemberships: { infinite: true } });

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
      } else if (!window.location.href.includes(ROUTES.SIGNUP_ORGANIZATION_LIST)) {
        redirectTo({ url: ROUTES.SIGNUP_ORGANIZATION_LIST });
      }
    }
  }, [setActive, isOrgListLoaded, clerkUser, orgId, redirectTo]);

  const currentUser = useMemo(() => (clerkUser ? toUserEntity(clerkUser as UserResource) : undefined), [clerkUser]);
  const currentOrganization = useMemo(
    () => (clerkOrganization ? toOrganizationEntity(clerkOrganization) : undefined),
    [clerkOrganization]
  );

  const value = useMemo(
    () =>
      ({
        isUserLoaded,
        isOrganizationLoaded,
        currentUser,
        currentOrganization,
      }) as AuthContextValue,
    [isUserLoaded, isOrganizationLoaded, currentUser, currentOrganization]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
