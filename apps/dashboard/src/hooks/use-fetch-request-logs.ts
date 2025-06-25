import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { getRequestLogs, GetRequestLogsParams, GetRequestLogsResponse } from '@/api/logs';

interface UseFetchRequestLogsParams extends Omit<GetRequestLogsParams, 'environment'> {
  enabled?: boolean;
  status?: string[];
}

export function useFetchRequestLogs(
  params: UseFetchRequestLogsParams = {},
  options: Omit<UseQueryOptions<GetRequestLogsResponse>, 'queryKey' | 'queryFn'> = {}
) {
  const { currentEnvironment } = useEnvironment();
  const { enabled = true, status, ...queryParams } = params;

  // Convert status array to statusCode parameter for API
  const apiParams = {
    ...queryParams,
    ...(status && status.length > 0 && { statusCode: status.join(',') }),
  };

  return useQuery<GetRequestLogsResponse>({
    queryKey: [QueryKeys.fetchRequestLogs, currentEnvironment?._id, apiParams],
    queryFn: () => getRequestLogs({ environment: currentEnvironment!, ...apiParams }),
    enabled: !!currentEnvironment && enabled,
    ...options,
  });
}
