import { UseQueryOptions, useQuery } from '@tanstack/react-query';

import { getIntegrations } from '../../api/integration';
import type { IntegrationEntity } from '../../pages/integrations/types';
import { QueryKeys } from '../../api/query.keys';

export function useIntegrations(options: UseQueryOptions<IntegrationEntity[], any, IntegrationEntity[]> = {}) {
  const { data, isLoading, ...rest } = useQuery<IntegrationEntity[], any, IntegrationEntity[]>(
    [QueryKeys.integrationsList],
    getIntegrations,
    { refetchOnMount: false, ...options }
  );

  return {
    integrations: data,
    loading: isLoading,
    ...rest,
  };
}
