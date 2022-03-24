import { useQuery } from 'react-query';
import { IntegrationEntity } from '@notifire/dal';
import { getActiveIntegrations } from '../../integration';

export function useActiveIntegrations() {
  const { data, isLoading, refetch } = useQuery<IntegrationEntity[]>('notificationsList', getActiveIntegrations);

  return {
    integrations: data,
    loading: isLoading,
    refetch,
  };
}
