import { UseQueryOptions, useQuery } from '@tanstack/react-query';

import { getIntegrations } from '../../api/integration';
import { IntegrationEntity } from '../../pages/integrations/IntegrationsStorePage';

export function useIntegrations(options: UseQueryOptions<IntegrationEntity[], any, IntegrationEntity[]> = {}) {
  const { data, isLoading, ...rest } = useQuery<IntegrationEntity[], any, IntegrationEntity[]>(
    ['integrationsList'],
    getIntegrations,
    { ...options }
  );

  return {
    integrations: data,
    loading: isLoading,
    ...rest,
  };
}
