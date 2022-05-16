import { useQuery } from 'react-query';
import { IntegrationEntity } from '@novu/dal';
import { getIntegrations } from '../../integration';

export function useIntegrations() {
  const { data, isLoading, refetch } = useQuery<IntegrationEntity[]>('integrationsList', getIntegrations);

  return {
    integrations: data,
    loading: isLoading,
    refetch,
  };
}
