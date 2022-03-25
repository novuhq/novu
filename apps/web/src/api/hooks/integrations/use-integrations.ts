import { useQuery } from 'react-query';
import { IntegrationEntity } from '@notifire/dal';
import { getIntegrations } from '../../integration';

export function useIntegrations() {
  const { data, isLoading, refetch } = useQuery<IntegrationEntity[]>('notificationsList', getIntegrations);

  return {
    integrations: data,
    loading: isLoading,
    refetch,
  };
}
