import { useQuery } from '@tanstack/react-query';
import { type ActivityFilters, getWorkflowRunsCount, type WorkflowRunsCountPeriod } from '@/api/activity';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

interface UseWorkflowRunsCountOptions {
  filters?: ActivityFilters;
  period?: WorkflowRunsCountPeriod;
  enabled?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

export function useFetchWorkflowRunsCount({
  filters,
  period,
  enabled = true,
  staleTime = 30000,
  refetchOnWindowFocus = false,
}: UseWorkflowRunsCountOptions = {}) {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [QueryKeys.fetchWorkflowRunsCount, currentEnvironment?._id, filters, period],
    queryFn: async ({ signal }) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment available');

      return getWorkflowRunsCount({
        environment,
        filters,
        period,
        signal,
      });
    },
    enabled: enabled && !!currentEnvironment,
    staleTime,
    refetchOnWindowFocus,
  });
}
