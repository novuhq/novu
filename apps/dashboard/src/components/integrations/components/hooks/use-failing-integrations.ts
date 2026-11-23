import { PermissionsEnum } from '@novu/shared';
import { useMemo } from 'react';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useHasPermission } from '@/hooks/use-has-permission';
import { isIntegrationFailing } from '../../utils/integration-health';

/** The worker can flag a failure at any time and nothing pushes it to the dashboard, so open pages re-check. */
const HEALTH_REFRESH_INTERVAL_MS = 60_000;

/**
 * Integrations whose provider rejected their credentials, in every environment (the dashboard's integration list
 * spans the organization). Newest failure first. Empty for members who can't read integrations.
 */
export function useFailingIntegrations() {
  const has = useHasPermission();
  const { integrations } = useFetchIntegrations({
    enabled: has({ permission: PermissionsEnum.INTEGRATION_READ }),
    // Only while the tab is visible (React Query pauses intervals in the background).
    refetchInterval: HEALTH_REFRESH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

  return useMemo(
    () =>
      (integrations ?? [])
        .filter(isIntegrationFailing)
        .sort((a, b) => (b.health?.failedAt ?? '').localeCompare(a.health?.failedAt ?? '')),
    [integrations]
  );
}
