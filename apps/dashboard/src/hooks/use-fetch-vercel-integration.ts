import { UseQueryOptions, useQuery } from '@tanstack/react-query';

import { fetchVercelIntegration, GetVercelConfigurationDetails } from '@/api/partner-integrations';
import { useEnvironment } from '@/context/environment/hooks';

export function useFetchVercelIntegration({
  configurationId,
  options,
}: {
  configurationId?: string | null;
  options?: Omit<UseQueryOptions<GetVercelConfigurationDetails[], Error>, 'queryKey' | 'queryFn'>;
}) {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: ['configurationDetails', configurationId],
    queryFn: async () => {
      const response = await fetchVercelIntegration({ configurationId, environment: currentEnvironment });

      return response.data;
    },
    ...options,
  });
}
