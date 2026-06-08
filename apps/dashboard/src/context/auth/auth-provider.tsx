import { useClerk, useOrganization, useUser } from '@clerk/react';
import type { OrganizationResource, UserResource } from '@clerk/shared/types';
import { ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { OnboardingProvisioningOverlay } from '@/components/onboarding/onboarding-provisioning-overlay';
import { isPublicAuthPath } from '@/utils/auth-routes';
import { storePendingCliAuthFromPath } from '@/utils/cli-auth-pending';
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
  // briefly showing a workspace before resolution) and (b) drive the redirect effect below.
  // Triggers when there is no active org at all (post sign-up, post delete/leave) — the picker
  // handles it.
  const needsOrgResolution = useMemo(() => {
    if (!isUserLoaded || !isOrganizationLoaded || !clerkUser) {
      return false;
    }

    return !clerkOrganization;
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

    // Stale org — actively clear the active organization so no other component (org dropdown,
    // env-scoped data hooks) sees a workspace while the picker mounts. This is the "logging out
    // should clear org selection" guarantee: the user always lands org-less on the picker.
    if (clerkOrganization && !hasClearedStaleOrgRef.current && clerk?.setActive) {
      hasClearedStaleOrgRef.current = true;
      void clerk.setActive({ organization: null });
    }

    // CliAuthPage never mounts here — `shouldBlockChildren` hides it while we redirect to the
    // org picker — so persist the device session before leaving `/cli/auth`.
    storePendingCliAuthFromPath(pathname, location.search);

    void navigate(ROUTES.SIGNUP_ORGANIZATION_LIST, { replace: true });
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
  // Otherwise the side-nav's org dropdown + any env-scoped routes briefly render before resolution.
  // The org-list / invitation / public-auth routes render normally — they own the resolution.
  const shouldBlockChildren = shouldHandleResolution;

  return (
    <AuthContext.Provider value={value}>
      <OnboardingProvisioningOverlay />
      {shouldBlockChildren ? null : children}
    </AuthContext.Provider>
  );
};
