import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { getRequestLogs, GetRequestLogsParams, GetRequestLogsResponse } from '@/api/logs';

interface UseFetchRequestLogsParams extends Omit<GetRequestLogsParams, 'environment'> {
  enabled?: boolean;
}

export function useFetchRequestLogs(
  params: UseFetchRequestLogsParams = {},
  options: Omit<UseQueryOptions<GetRequestLogsResponse>, 'queryKey' | 'queryFn'> = {}
) {
  const { currentEnvironment } = useEnvironment();
  const { enabled = true, ...queryParams } = params;

  return useQuery<GetRequestLogsResponse>({
    queryKey: [QueryKeys.fetchRequestLogs, currentEnvironment?._id, queryParams],
    queryFn: () => getRequestLogs({ environment: currentEnvironment!, ...queryParams }),
    enabled: !!currentEnvironment && enabled,
    ...options,
  });
}
