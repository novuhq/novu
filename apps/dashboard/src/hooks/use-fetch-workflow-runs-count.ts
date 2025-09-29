import { useQuery } from '@tanstack/react-query';
import { ActivityFilters, getWorkflowRunsCount } from '@/api/activity';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

interface UseWorkflowRunsCountOptions {
  filters?: ActivityFilters;
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

export function useFetchWorkflowRunsCount({
  filters,
  enabled = true,
  staleTime = 30000,
  refetchOnWindowFocus = false,
}: UseWorkflowRunsCountOptions = {}) {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.fetchWorkflowRunsCount, currentEnvironment?._id, filters],
    queryFn: async ({ signal }) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment available');

      return getWorkflowRunsCount({
        environment,
        filters,
        signal,
      });
    },
    enabled: enabled && !!currentEnvironment,
    staleTime,
    refetchOnWindowFocus,
  });
}
