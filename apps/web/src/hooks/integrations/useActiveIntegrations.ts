import { UseQueryOptions, useQuery } from '@tanstack/react-query';

import { getActiveIntegrations } from '../../api/integration';
import { QueryKeys } from '../../api/query.keys';
import { IntegrationEntity } from '../../pages/integrations/IntegrationsStorePage';

export function useActiveIntegrations(options: UseQueryOptions<IntegrationEntity[], any, IntegrationEntity[]> = {}) {
  const { data, ...rest } = useQuery<IntegrationEntity[], any, IntegrationEntity[]>(
    [QueryKeys.activeNotificationsList],
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
