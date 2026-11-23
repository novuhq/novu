import { useMemo } from 'react';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { isIntegrationFailing } from '../../utils/integration-health';

/**
 * Integrations whose provider rejected their credentials, in every environment (the dashboard's integration list
 * spans the organization). Newest failure first.
 */
export function useFailingIntegrations() {
  const { integrations } = useFetchIntegrations();

  return useMemo(
    () =>
      (integrations ?? [])
        .filter(isIntegrationFailing)
        .sort((a, b) => (b.health?.failedAt ?? '').localeCompare(a.health?.failedAt ?? '')),
    [integrations]
  );
}
