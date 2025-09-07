import { StepTypeEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { useFetchWorkflows } from './use-fetch-workflows';
import { usePatchWorkflow } from './use-patch-workflow';

interface UseInboxIntegrationWorkflowUpdaterOptions {
  enabled?: boolean;
  maxToUpdate?: number;
  onSuccess?: (updatedWorkflows: string[]) => void;
}

export function useInboxIntegratiOkayonWorkflowUpdater({
  enabled = true,
  maxToUpdate = 20,
  onSuccess,
}: UseInboxIntegrationWorkflowUpdaterOptions = {}) {
  if (maxToUpdate <= 0) {
    throw new Error('maxToUpdate must be a positive integer');
  }
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const { data: workflowsData, isLoading: isLoadingWorkflows } = useFetchWorkflows({
    limit: maxToUpdate,
    offset: 0,
    query: '',
  });

  const { isPending: isPatching } = usePatchWorkflow();

  const workflowsWithInAppSteps = useMemo(() => {
    return (
      workflowsData?.workflows?.filter((workflow) => workflow.stepTypeOverviews?.includes(StepTypeEnum.IN_APP)) ?? []
    );
  }, [workflowsData?.workflows]);

  const { mutateAsync: updateWorkflowsWithInAppSteps, isPending: isUpdating } = useMutation({
    mutationFn: async () => {
      // Always invalidate queries to force refetch with fresh data
      // This ensures we get the latest workflow state even if no workflows with in-app steps exist yet
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflows, currentEnvironment?._id] });

      // If we have workflows with in-app steps, also invalidate their individual queries
      if (workflowsWithInAppSteps.length > 0) {
        const workflowsToUpdate = workflowsWithInAppSteps.slice(0, maxToUpdate);

        for (const workflow of workflowsToUpdate) {
          queryClient.invalidateQueries({
            queryKey: [QueryKeys.fetchWorkflow, currentEnvironment?._id, workflow.slug],
          });
        }

        return workflowsToUpdate.map((w) => w.slug);
      }

      return [];
    },
    onSuccess: (updatedWorkflowSlugs) => {
      onSuccess?.(updatedWorkflowSlugs);
    },
  });

  const triggerWorkflowUpdate = useCallback(() => {
    if (enabled) {
      updateWorkflowsWithInAppSteps();
    }
  }, [enabled, updateWorkflowsWithInAppSteps]);

  return {
    workflowsWithInAppSteps,
    triggerWorkflowUpdate,
    isLoading: isLoadingWorkflows,
    isUpdating: isUpdating || isPatching,
    hasWorkflowsWithInAppSteps: workflowsWithInAppSteps.length > 0,
  };
}
