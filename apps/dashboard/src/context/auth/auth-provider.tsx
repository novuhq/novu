import { useOrganization, useUser } from '@clerk/clerk-react';
import type { OrganizationResource, UserResource } from '@clerk/types';
import { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { ROUTES } from '@/utils/routes';
import { AuthContext } from './auth-context';
import { toOrganizationEntity, toUserEntity } from './mappers';
import type { AuthContextValue } from './types';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { organization: clerkOrganization, isLoaded: isOrganizationLoaded } = useOrganization();

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

  useEffect(() => {
    if (!isUserLoaded || !isOrganizationLoaded) return;

    /**
     * If the user didn't create any organization yet, or there is no current active organization(e.g. after the user the deleting or leaving their org),
     * redirect to the organization list page.
     *
     * See https://clerk.com/docs/organizations/force-organizations#limit-access-using-the-clerk-middleware-helper
     */
    const isOnOrgListPage = window.location.pathname === ROUTES.SIGNUP_ORGANIZATION_LIST;
    const isOnInvitationPage = window.location.pathname === ROUTES.INVITATION_ACCEPT;

    if (clerkUser && !clerkOrganization && !isOnOrgListPage && !isOnInvitationPage) {
      const pendingInvitationId = sessionStorage.getItem('pendingInvitationId');

      if (pendingInvitationId) {
        return redirectTo({ url: `${ROUTES.INVITATION_ACCEPT}?id=${pendingInvitationId}` });
      }

      return redirectTo({ url: ROUTES.SIGNUP_ORGANIZATION_LIST });
    }
  }, [isUserLoaded, isOrganizationLoaded, clerkUser, clerkOrganization, redirectTo]);

  const currentUser = useMemo(
    () => (clerkUser ? toUserEntity(clerkUser as unknown as UserResource) : undefined),
    [clerkUser]
  );
  const currentOrganization = useMemo(
    () => (clerkOrganization ? toOrganizationEntity(clerkOrganization as unknown as OrganizationResource) : undefined),
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
