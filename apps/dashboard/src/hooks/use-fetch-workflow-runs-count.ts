import { useQuery } from '@tanstack/react-query';
import { ActivityFilters, getWorkflowRunsCount } from '@/api/activity';
import { useEnvironment } from '@/context/environment/hooks';
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
      if (!currentEnvironment) {
        throw new Error('No environment available');
      }

      return getWorkflowRunsCount({
        environment: currentEnvironment,
        filters,
        signal,
      });
    },
    enabled: enabled && !!currentEnvironment,
    staleTime,
    refetchOnWindowFocus,
  });
}
