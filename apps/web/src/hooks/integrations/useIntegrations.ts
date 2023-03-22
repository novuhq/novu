import { UseQueryOptions, useQuery } from '@tanstack/react-query';

import { getIntegrations } from '../../api/integration';
import { IntegrationEntity } from '../../pages/integrations/IntegrationsStorePage';
import { QueryKeys } from '../../api/query.keys';

export function useIntegrations(options: UseQueryOptions<IntegrationEntity[], any, IntegrationEntity[]> = {}) {
  const { data, isLoading, ...rest } = useQuery<IntegrationEntity[], any, IntegrationEntity[]>(
    [QueryKeys.integrationsList],
    getIntegrations,
    { ...options }
  );

  return {
    integrations: data,
    loading: isLoading,
    ...rest,
  };
}
