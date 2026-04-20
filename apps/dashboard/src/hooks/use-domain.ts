import { DomainStatusEnum } from '@novu/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DomainResponse, fetchDomain } from '@/api/domains';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

const VERIFICATION_POLL_INTERVAL_MS = 5_000;

export function useFetchDomain(domainId: string | undefined) {
  const { currentEnvironment } = useEnvironment();

  return useQuery<DomainResponse>({
    queryKey: [QueryKeys.fetchDomain, domainId, currentEnvironment?._id],
    queryFn: () => fetchDomain(domainId!, currentEnvironment!),
    enabled: !!domainId && !!currentEnvironment,
    refetchInterval: (query) => {
      const data = query.state.data;

      if (!data || data.status === DomainStatusEnum.PENDING) {
        return VERIFICATION_POLL_INTERVAL_MS;
      }

      return false;
    },
  });
}

export function useRefreshDomain(domainId: string | undefined) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return {
    refresh: () =>
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchDomain, domainId, currentEnvironment?._id],
      }),
  };
}
