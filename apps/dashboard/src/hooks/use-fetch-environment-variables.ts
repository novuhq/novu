import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getEnvironmentVariables } from '@/api/environment-variables';
import { QueryKeys } from '@/utils/query-keys';

interface UseFetchEnvironmentVariablesParams {
  search?: string;
  enabled?: boolean;
}

export function useFetchEnvironmentVariables({ search = '', enabled = true }: UseFetchEnvironmentVariablesParams = {}) {
  return useQuery({
    queryKey: [QueryKeys.fetchEnvironmentVariables, { search }],
    queryFn: () => getEnvironmentVariables({ search: search || undefined }),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    enabled,
  });
}
