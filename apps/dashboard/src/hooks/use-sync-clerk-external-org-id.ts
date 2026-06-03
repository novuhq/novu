import { useOrganization } from '@clerk/react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth/hooks';

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 40;

/**
 * After org creation, Novu's backend writes `externalOrgId` into Clerk `publicMetadata`
 * asynchronously. Until then, `currentOrganization._id` is empty and environment/API-key
 * queries stay disabled. Poll Clerk until the metadata arrives (same gap as agents setup).
 */
export function useSyncClerkExternalOrgId() {
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const { currentOrganization, isOrganizationLoaded } = useAuth();
  const externalOrgId = currentOrganization?._id;
  const [syncTimedOut, setSyncTimedOut] = useState(false);
  const attemptsRef = useRef(0);

  const needsSync = Boolean(
    isOrgLoaded && isOrganizationLoaded && organization && !externalOrgId
  );

  useEffect(() => {
    if (!needsSync) {
      attemptsRef.current = 0;
      setSyncTimedOut(false);

      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (cancelled) {
        return;
      }

      attemptsRef.current += 1;

      if (attemptsRef.current > MAX_ATTEMPTS) {
        setSyncTimedOut(true);

        return;
      }

      try {
        await organization?.reload();
      } catch {
        // Webhook may still be in flight; keep polling.
      }

      if (!cancelled) {
        timeoutId = setTimeout(() => {
          void poll();
        }, POLL_INTERVAL_MS);
      }
    };

    void poll();

    return () => {
      cancelled = true;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [needsSync, organization]);

  const isSyncingOrg = needsSync && !syncTimedOut;

  return { isSyncingOrg, syncTimedOut };
}
