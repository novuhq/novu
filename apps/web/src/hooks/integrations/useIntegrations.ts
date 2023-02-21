import { useQuery } from '@tanstack/react-query';

import { getIntegrations } from '../../api/integration';

export function useIntegrations() {
  const { data, isLoading, refetch } = useQuery(['integrationsList'], getIntegrations);

  return {
    integrations: data,
    loading: isLoading,
    refetch,
  };
}
