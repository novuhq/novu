import { useQuery } from '@tanstack/react-query';
import { getIntegrations } from '@/api/integrations';
import { IIntegration } from '@novu/shared';
import { useEnvironment } from '../context/environment/hooks';
import { QueryKeys } from '../utils/query-keys';

export function useFetchIntegrations({
  refetchInterval,
  refetchOnWindowFocus,
}: { refetchInterval?: number; refetchOnWindowFocus?: boolean } = {}) {
  const { currentEnvironment } = useEnvironment();

  const { data: integrations, ...rest } = useQuery<IIntegration[]>({
    queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id],
    queryFn: () => getIntegrations({ environment: currentEnvironment! }),
    refetchInterval,
    refetchOnWindowFocus,
    enabled: !!currentEnvironment?._id,
  });

  return {
    integrations,
    ...rest,
  };
}
