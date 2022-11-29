import { useQuery } from 'react-query';
import { getActiveIntegrations } from '../../integration';

export function useActiveIntegrations() {
  const { data, isLoading, refetch } = useQuery('notificationsList', getActiveIntegrations);

  return {
    integrations: data,
    loading: isLoading,
    refetch,
  };
}
