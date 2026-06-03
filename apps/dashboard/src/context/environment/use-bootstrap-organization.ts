import { useOrganization, useUser } from '@clerk/react';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth/hooks';
import { useFetchEnvironments } from '@/context/environment/hooks';

// Non-empty cache key that enables the environments query before Novu's org id is known.
// The org id is only a React Query cache key — `getEnvironments` authenticates via the session.
const BOOTSTRAP_ORG_CACHE_KEY = 'org';

/**
 * Right after org creation, Novu's backend writes `externalOrgId` into Clerk asynchronously.
 * Until it lands, `currentOrganization._id` is empty and the org-scoped environments query stays
 * disabled. Rather than polling Clerk (fragile, can stall), poll Novu's environments endpoint and,
 * once Novu reports the org is ready, reload Clerk once so `externalOrgId` syncs and the real
 * org-scoped query enables. Mirrors the inbox onboarding page.
 */
export function useBootstrapOrganization() {
  const { organization: clerkOrganization, isLoaded: isClerkOrgLoaded } = useOrganization();
  const { user: clerkUser } = useUser();
  const { currentOrganization, isOrganizationLoaded } = useAuth();

  const needsBootstrap = Boolean(
    isClerkOrgLoaded && isOrganizationLoaded && clerkOrganization && !currentOrganization?._id
  );

  const { environments } = useFetchEnvironments({
    organizationId: needsBootstrap ? BOOTSTRAP_ORG_CACHE_KEY : '',
    refetchInterval: needsBootstrap ? 1000 : undefined,
    showError: false,
  });

  const hasReloadedRef = useRef(false);

  useEffect(() => {
    if (!needsBootstrap) {
      hasReloadedRef.current = false;

      return;
    }

    if (!environments?.length || hasReloadedRef.current) {
      return;
    }

    hasReloadedRef.current = true;
    void clerkUser?.reload();
    void clerkOrganization?.reload();
  }, [needsBootstrap, environments, clerkUser, clerkOrganization]);
}
