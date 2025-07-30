import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getRequestTraces, GetRequestTracesParams } from '../api/logs';
import { RequestTraces } from '../types/logs';
import { useEnvironment } from '../context/environment/hooks';

interface UseFetchRequestTracesParams extends Omit<GetRequestTracesParams, 'environment'> {
  enabled?: boolean;
}

export function useFetchRequestTraces(
  params: UseFetchRequestTracesParams,
  options: Omit<UseQueryOptions<RequestTraces>, 'queryKey' | 'queryFn'> = {}
) {
  const { currentEnvironment } = useEnvironment();

  return useQuery<RequestTraces>({
    queryKey: ['requestTraces', currentEnvironment?.slug, params.requestId],
    queryFn: () =>
      getRequestTraces({
        environment: currentEnvironment!,
        ...params,
      }),
    enabled: !!currentEnvironment && !!params.requestId && (params.enabled !== false),
    ...options,
  });
} 
