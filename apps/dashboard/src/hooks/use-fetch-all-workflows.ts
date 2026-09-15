import { DirectionEnum } from '@novu/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { getWorkflows } from '@/api/workflows';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

const WORKFLOW_PAGE_SIZE = 100;

type WorkflowPageSummary = {
  workflows: unknown[];
  totalCount: number;
};

export function getNextWorkflowOffset(lastPage: WorkflowPageSummary, pages: WorkflowPageSummary[]): number | undefined {
  if (lastPage.workflows.length === 0) {
    return undefined;
  }

  const loadedWorkflowCount = pages.reduce((count, page) => count + page.workflows.length, 0);

  return loadedWorkflowCount < lastPage.totalCount ? loadedWorkflowCount : undefined;
}

export function useFetchAllWorkflows(enabled = true) {
  const { currentEnvironment } = useEnvironment();
  const workflowsQuery = useInfiniteQuery({
    queryKey: [
      QueryKeys.fetchWorkflows,
      currentEnvironment?._id,
      { scope: 'integration-condition-payloads', limit: WORKFLOW_PAGE_SIZE },
    ],
    queryFn: ({ pageParam }) =>
      getWorkflows({
        environment: requireEnvironment(currentEnvironment, 'No environment available'),
        limit: WORKFLOW_PAGE_SIZE,
        offset: pageParam,
        query: '',
        orderDirection: DirectionEnum.DESC,
      }),
    initialPageParam: 0,
    getNextPageParam: getNextWorkflowOffset,
    enabled: enabled && !!currentEnvironment?._id,
  });

  const { fetchNextPage, hasNextPage, isFetchNextPageError, isFetchingNextPage } = workflowsQuery;

  useEffect(() => {
    if (enabled && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [enabled, fetchNextPage, hasNextPage, isFetchNextPageError, isFetchingNextPage]);

  const workflows = useMemo(
    () => workflowsQuery.data?.pages.flatMap((page) => page.workflows) ?? [],
    [workflowsQuery.data?.pages]
  );

  return { ...workflowsQuery, workflows };
}
