import { useQuery } from '@tanstack/react-query';
import { getIntegrationMessageCount } from '../../integration';

export function useMessageCount(providerId: string) {
  const { data, isLoading, refetch } = useQuery(
    ['integrationLimit', providerId],
    () => getIntegrationMessageCount(providerId),
    {
      refetchInterval: 180000,
    }
  );

  return {
    data,
    loading: isLoading,
    refetch,
  };
}
