import { useOrganization } from '@clerk/react';
import { type UseQueryOptions, useQuery } from '@tanstack/react-query';
import { type GetRequestLogsParams, type GetRequestLogsResponse, getRequestLogs } from '@/api/logs';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { toRequestLogsCreatedGte } from '@/utils/logs-filters.utils';
import { QueryKeys } from '@/utils/query-keys';

interface UseFetchRequestLogsParams extends Omit<GetRequestLogsParams, 'environment'> {
  enabled?: boolean;
  status?: string[];
}

export function useFetchRequestLogs(
  params: UseFetchRequestLogsParams = {},
  options: Omit<UseQueryOptions<GetRequestLogsResponse>, 'queryKey' | 'queryFn'> = {}
) {
  const { currentEnvironment } = useEnvironment();
  const { organization } = useOrganization();
  const { subscription, isLoading: isLoadingSubscription } = useFetchSubscription();
  const { enabled = true, status, ...queryParams } = params;

  // Convert status array to statusCode parameter for API
  const apiParams = {
    ...queryParams,
    ...(status && status.length > 0 && { statusCodes: status.join(',') }),
  };

  return useQuery<GetRequestLogsResponse>({
    queryKey: [QueryKeys.fetchRequestLogs, currentEnvironment?._id, apiParams, subscription?.apiServiceLevel],
    queryFn: () => {
      if (!currentEnvironment) {
        return Promise.reject(new Error('An environment is required'));
      }

      return getRequestLogs({
        environment: currentEnvironment,
        ...apiParams,
        createdGte: toRequestLogsCreatedGte({ createdGte: apiParams.createdGte, subscription, organization }),
      });
    },
    // Until the plan is known, a createdGte past its retention window would be sent as is and get a 402.
    enabled: !!currentEnvironment && enabled && !isLoadingSubscription,
    refetchOnWindowFocus: false,
    ...options,
  });
}
