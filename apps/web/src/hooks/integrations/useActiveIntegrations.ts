import { UseQueryOptions, useQuery } from '@tanstack/react-query';

import { getActiveIntegrations } from '../../api/integration';
import { QueryKeys } from '../../api/query.keys';
import type { IntegrationEntity } from '../../pages/integrations/types';

export function useActiveIntegrations(options: UseQueryOptions<IntegrationEntity[], any, IntegrationEntity[]> = {}) {
  const { data, ...rest } = useQuery<IntegrationEntity[], any, IntegrationEntity[]>(
    [QueryKeys.activeIntegrations],
    getActiveIntegrations,
    {
      ...options,
    }
  );

  return {
    integrations: data,
    ...rest,
  };
}
