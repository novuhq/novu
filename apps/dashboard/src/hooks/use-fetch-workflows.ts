import { DirectionEnum } from '@novu/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getWorkflows } from '@/api/workflows';
import { QueryKeys } from '@/utils/query-keys';
import { useEnvironment } from '../context/environment/hooks';

interface UseWorkflowsParams {
  limit?: number;
  offset?: number;
  query?: string;
  orderBy?: string;
  orderDirection?: DirectionEnum;
  tags?: string[];
  status?: string[];
}

export function useFetchWorkflows({
  limit = 12,
  offset = 0,
  query = '',
  orderBy = '',
  orderDirection = DirectionEnum.DESC,
  tags = [],
  status = [],
}: UseWorkflowsParams = {}) {
  const { currentEnvironment } = useEnvironment();

  const workflowsQuery = useQuery({
    queryKey: [
      QueryKeys.fetchWorkflows,
      currentEnvironment?._id,
      { limit, offset, query, orderBy, orderDirection, tags, status },
    ],
    queryFn: () =>
      getWorkflows({ environment: currentEnvironment!, limit, offset, query, orderBy, orderDirection, tags, status }),
    placeholderData: keepPreviousData,
    enabled: !!currentEnvironment?._id,
    refetchOnWindowFocus: true,
  });

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = workflowsQuery.data ? Math.ceil(workflowsQuery.data.totalCount / limit) : 0;

  return {
    ...workflowsQuery,
    currentPage,
    totalPages,
  };
}
