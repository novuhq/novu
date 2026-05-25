import { useOrganization, useUser } from '@clerk/react';
import type { OrganizationResource, UserResource } from '@clerk/shared/types';
import { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectProvisioningOverlay } from '@/components/auth/connect-provisioning-overlay';
import { IS_NOVU_CONNECT } from '@/config';
import { isPublicAuthPath } from '@/utils/auth-routes';
import { isActiveConnectWorkspace, isConnectWorkspace } from '@/utils/connect';
import { ROUTES } from '@/utils/routes';
import { AuthContext } from './auth-context';
import { toOrganizationEntity, toUserEntity } from './mappers';
import type { AuthContextValue } from './types';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
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
    const pathname = window.location.pathname;
    const isOnOrgListPage = pathname === ROUTES.SIGNUP_ORGANIZATION_LIST;
    const isOnInvitationPage = pathname.startsWith(ROUTES.INVITATION_ACCEPT);

    if (!clerkUser || isOnOrgListPage || isOnInvitationPage || isPublicAuthPath(pathname)) return;

    const needsOrgResolution = (() => {
      if (IS_NOVU_CONNECT) {
        return (
          !clerkOrganization ||
          !isActiveConnectWorkspace(clerkOrganization.publicMetadata, {
            userId: clerkUser.id,
            organizationId: clerkOrganization.id,
          })
        );
      }

      // Orgs without productType stay on Platform to avoid duplicating Connect orgs mid-sync.
      return !clerkOrganization || isConnectWorkspace(clerkOrganization.publicMetadata);
    })();

    if (needsOrgResolution) {
      const pendingInvitationId = sessionStorage.getItem('pendingInvitationId');

      if (pendingInvitationId) {
        return redirectTo({ url: `${ROUTES.INVITATION_ACCEPT}?id=${pendingInvitationId}` });
      }

      navigate(ROUTES.SIGNUP_ORGANIZATION_LIST, { replace: true });

      return;
    }
  }, [isUserLoaded, isOrganizationLoaded, clerkUser, clerkOrganization, redirectTo, navigate]);

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

  return (
    <AuthContext.Provider value={value}>
      {IS_NOVU_CONNECT ? <ConnectProvisioningOverlay /> : null}
      {children}
    </AuthContext.Provider>
  );
};
