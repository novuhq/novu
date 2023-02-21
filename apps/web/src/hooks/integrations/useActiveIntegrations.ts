import { useQuery } from '@tanstack/react-query';

import { getActiveIntegrations } from '../../api/integration';

export function useActiveIntegrations() {
  const { data, isLoading, refetch } = useQuery(['notificationsList'], getActiveIntegrations);

  return {
    integrations: data,
    loading: isLoading,
    refetch,
  };
}
