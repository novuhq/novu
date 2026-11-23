import { IIntegration } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { getIntegrations } from '@/api/integrations';
import { useEnvironment } from '../context/environment/hooks';
import { QueryKeys } from '../utils/query-keys';

export function useFetchIntegrations({
  refetchInterval,
  refetchOnWindowFocus,
  enabled = true,
}: {
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  enabled?: boolean;
} = {}) {
  const { currentEnvironment } = useEnvironment();

  const { data: integrations, ...rest } = useQuery<IIntegration[]>({
    queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id],
    queryFn: () => {
      if (!currentEnvironment) throw new Error('No environment selected');

      return getIntegrations({ environment: currentEnvironment });
    },
    refetchInterval,
    refetchOnWindowFocus,
    enabled: enabled && !!currentEnvironment?._id,
  });

  return {
    integrations,
    ...rest,
  };
}
