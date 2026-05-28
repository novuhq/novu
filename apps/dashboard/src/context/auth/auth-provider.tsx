import { useClerk, useOrganization, useUser } from '@clerk/react';
import type { OrganizationResource, UserResource } from '@clerk/shared/types';
import { ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { OnboardingProvisioningOverlay } from '@/components/auth/connect-provisioning-overlay';
import { IS_NOVU_CONNECT } from '@/config';
import { isPublicAuthPath } from '@/utils/auth-routes';
import { readPendingCliAuth, storePendingCliAuthFromPath } from '@/utils/cli-auth-pending';
import { buildConnectProvisionOrgListPath } from '@/utils/connect';
import { isActiveConnectWorkspace, isConnectWorkspace } from '@/utils/connect';
import { ROUTES } from '@/utils/routes';
import { AuthContext } from './auth-context';
import { toOrganizationEntity, toUserEntity } from './mappers';
import type { AuthContextValue } from './types';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { organization: clerkOrganization, isLoaded: isOrganizationLoaded } = useOrganization();
  const clerk = useClerk();
  // Once we've kicked off `setActive({ organization: null })` we don't want to fire it again on
  // the next render — Clerk will eventually re-emit a `clerkOrganization = null` snapshot and the
  // mismatch will read as resolved.
  const hasClearedStaleOrgRef = useRef(false);

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

  const pathname = location.pathname;
  const isOnOrgListPage = pathname === ROUTES.SIGNUP_ORGANIZATION_LIST;
  const isOnInvitationPage = pathname.startsWith(ROUTES.INVITATION_ACCEPT);
  const isOnPublicAuth = isPublicAuthPath(pathname);

  // Computed during render so we can both (a) gate `children` (preventing the side-nav from
  // briefly showing the wrong workspace name when the active Clerk org belongs to the OTHER
  // product) and (b) drive the redirect effect below.
  //
  // Triggers on:
  //   - no active org at all (post sign-up, post delete/leave) — picker handles it.
  //   - cross-product org on the wrong host — e.g. user had a Connect org active, signed out,
  //     signed back into Platform; Clerk re-activates `lastActiveOrganizationId` (the Connect
  //     org) on the fresh session. We clear it and route through the picker.
  const needsOrgResolution = useMemo(() => {
    if (!isUserLoaded || !isOrganizationLoaded || !clerkUser) {
      return false;
    }

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
  }, [isUserLoaded, isOrganizationLoaded, clerkUser, clerkOrganization]);

  // The picker / invitation-accept / public auth pages own the resolution flow themselves —
  // don't redirect away from them. (Also resets the "cleared" ref so a future stale-org
  // transition still triggers a fresh clear.)
  const shouldHandleResolution = needsOrgResolution && !isOnOrgListPage && !isOnInvitationPage && !isOnPublicAuth;

  useEffect(() => {
    if (!shouldHandleResolution) {
      hasClearedStaleOrgRef.current = false;

      return;
    }

    /**
     * If the user didn't create any organization yet, or there is no current active organization(e.g. after the user the deleting or leaving their org),
     * redirect to the organization list page.
     *
     * See https://clerk.com/docs/organizations/force-organizations#limit-access-using-the-clerk-middleware-helper
     */
    const pendingInvitationId = sessionStorage.getItem('pendingInvitationId');

    if (pendingInvitationId) {
      redirectTo({ url: `${ROUTES.INVITATION_ACCEPT}?id=${pendingInvitationId}` });

      return;
    }

    // Cross-product stale org — actively clear the active organization so no other component
    // (org dropdown, env-scoped data hooks) sees the wrong workspace while the picker mounts.
    // This is the "logging out should clear org selection" guarantee in tab-agnostic form:
    // whether the stale org came from a fresh sign-in on the other product, a direct URL hit,
    // or a still-open tab on the other product, the user always lands org-less on the picker.
    if (clerkOrganization && !hasClearedStaleOrgRef.current && clerk?.setActive) {
      hasClearedStaleOrgRef.current = true;
      void clerk.setActive({ organization: null });
    }

    // CliAuthPage never mounts here — `shouldBlockChildren` hides it while we redirect to the
    // org picker — so persist the device session before leaving `/cli/auth`.
    storePendingCliAuthFromPath(pathname, location.search);

    const pendingCliAuth = readPendingCliAuth();
    const orgListPath =
      pendingCliAuth && IS_NOVU_CONNECT
        ? buildConnectProvisionOrgListPath(ROUTES.SIGNUP_ORGANIZATION_LIST)
        : ROUTES.SIGNUP_ORGANIZATION_LIST;

    void navigate(orgListPath, { replace: true });
  }, [shouldHandleResolution, clerkOrganization, clerk, redirectTo, navigate, pathname, location.search]);

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

  // While we're queueing the redirect to `/auth/organization-list`, hide the regular app shell.
  // Otherwise the side-nav's org dropdown + any env-scoped routes briefly render with the
  // stale cross-product org (e.g. Connect org showing up on Platform right after sign-in).
  // The org-list / invitation / public-auth routes render normally — they own the resolution.
  const shouldBlockChildren = shouldHandleResolution;

  return (
    <AuthContext.Provider value={value}>
      <OnboardingProvisioningOverlay />
      {shouldBlockChildren ? null : children}
    </AuthContext.Provider>
  );
};
