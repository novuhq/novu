import type { WorkflowResponseDto } from '@novu/shared';
import { useMemo } from 'react';
import { getWorkflow } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';
import { useLocalMode } from '@/context/local-mode';
import { useLocalOrRemoteData } from '@/hooks/use-local-or-remote-data';
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

  const localWorkflow = useMemo(() => {
    if (!isLocalRoute || !workflowSlug) return undefined;

    return findLocalWorkflow(localWorkflows, workflowSlug);
  }, [isLocalRoute, workflowSlug, localWorkflows]);

  const { data, isPending, error, refetch } = useLocalOrRemoteData({
    isLocalRoute,
    localData: localWorkflow,
    localIsPending: isDiscoverPending,
    localRefetch: refetchDiscover,
    queryKey: [QueryKeys.fetchWorkflow, currentEnvironment?._id, workflowId],
    queryFn: () => getWorkflow({ environment: currentEnvironment!, workflowSlug }),
    enabled: !!currentEnvironment?._id && !!workflowSlug,
  });

  return {
    workflow: data,
    isPending,
    error,
    refetch,
  };
};
