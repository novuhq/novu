import type { OrganizationResource } from '@clerk/shared/types';
import { useOrganization } from '@clerk/react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/auth/hooks';

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 40;

function readExternalOrgId(
  organization: OrganizationResource | null | undefined,
  mappedOrganizationId?: string
): string | undefined {
  if (mappedOrganizationId) {
    return mappedOrganizationId;
  }

  const fromMetadata = organization?.publicMetadata?.externalOrgId;

  return typeof fromMetadata === 'string' && fromMetadata.length > 0 ? fromMetadata : undefined;
}

/**
 * After org creation, Novu's backend writes `externalOrgId` into Clerk `publicMetadata`
 * asynchronously. Until then, environment queries stay disabled. Poll Clerk until synced.
 */
export function useSyncClerkExternalOrgId() {
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const { currentOrganization, isOrganizationLoaded } = useAuth();
  const externalOrgId = readExternalOrgId(organization, currentOrganization?._id);
  const [syncTimedOut, setSyncTimedOut] = useState(false);

  const needsSync = Boolean(
    isOrgLoaded && isOrganizationLoaded && organization && !externalOrgId
  );

  const organizationRef = useRef(organization);
  organizationRef.current = organization;

  useEffect(() => {
    if (!needsSync) {
      setSyncTimedOut(false);

      return;
    }

    let cancelled = false;

    async function pollUntilSynced() {
      for (let attempt = 0; attempt < MAX_ATTEMPTS && !cancelled; attempt += 1) {
        try {
          const currentOrganization = organizationRef.current;
          const refreshed = await currentOrganization?.reload();

          if (readExternalOrgId(refreshed ?? currentOrganization)) {
            return;
          }
        } catch {
          // Webhook may still be in flight; keep polling.
        }

        if (attempt < MAX_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      }

      if (!cancelled) {
        setSyncTimedOut(true);
      }
    }

    void pollUntilSynced();

    return () => {
      cancelled = true;
    };
  }, [needsSync]);

  const isOrganizationSyncing = needsSync && !syncTimedOut;

  return { isOrganizationSyncing, organizationSyncTimedOut: syncTimedOut };
}
