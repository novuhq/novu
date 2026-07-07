import type { WorkflowResponseDto } from '@novu/shared';
import { QueryObserverResult, RefetchOptions, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { getWorkflow } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';
import { useLocalMode } from '@/context/local-mode';
import { getIdFromSlug, WORKFLOW_DIVIDER } from '@/utils/id-utils';
import { findLocalWorkflow } from '@/utils/local-bridge';
import { QueryKeys } from '@/utils/query-keys';

export const useFetchWorkflow = ({ workflowSlug }: { workflowSlug?: string }) => {
  const { currentEnvironment } = useEnvironment();
  const { isLocalRoute, workflows: localWorkflows, isDiscoverPending, refetchDiscover } = useLocalMode();
  const workflowId = useMemo(
    () => getIdFromSlug({ slug: workflowSlug ?? '', divider: WORKFLOW_DIVIDER }),
    [workflowSlug]
  );

  // Virtual (local bridge) workflows are not persisted — resolve them from
  // the discover cache instead of the API, for every caller of this hook
  // (breadcrumbs, command palette, ...).
  const localWorkflow = useMemo(() => {
    if (!isLocalRoute || !workflowSlug) return undefined;

    return findLocalWorkflow(localWorkflows, workflowSlug);
  }, [isLocalRoute, workflowSlug, localWorkflows]);

  const { data, isPending, error, refetch } = useQuery<WorkflowResponseDto>({
    queryKey: [QueryKeys.fetchWorkflow, currentEnvironment?._id, workflowId],
    queryFn: () => getWorkflow({ environment: currentEnvironment!, workflowSlug }),
    enabled: !!currentEnvironment?._id && !!workflowSlug && !isLocalRoute,
  });

  const refetchLocal = useCallback(
    async (_options?: RefetchOptions) => {
      await refetchDiscover();

      return { data: localWorkflow } as QueryObserverResult<WorkflowResponseDto, Error>;
    },
    [refetchDiscover, localWorkflow]
  );

  if (isLocalRoute) {
    return {
      workflow: localWorkflow,
      isPending: isDiscoverPending,
      error: null,
      refetch: refetchLocal,
    };
  }

  return {
    workflow: data,
    isPending,
    error,
    refetch,
  };
};
