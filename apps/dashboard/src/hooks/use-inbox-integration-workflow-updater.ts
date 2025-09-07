import { StepTypeEnum } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useFetchWorkflows } from './use-fetch-workflows';
import { usePatchWorkflow } from './use-patch-workflow';

interface UseInboxIntegrationWorkflowUpdaterOptions {
  enabled?: boolean;
  maxToUpdate?: number;
  onSuccess?: (updatedWorkflows: string[]) => void;
}

export function useInboxIntegrationWorkflowUpdater({
  enabled = true,
  maxToUpdate = 20,
  onSuccess,
}: UseInboxIntegrationWorkflowUpdaterOptions = {}) {
  if (maxToUpdate <= 0) {
    throw new Error('maxToUpdate must be a positive integer');
  }
  const { data: workflowsData, isLoading: isLoadingWorkflows } = useFetchWorkflows({
    limit: maxToUpdate,
    offset: 0,
    query: '',
  });

  const { patchWorkflow: updateWorkflow, isPending: isPatching } = usePatchWorkflow();

  const workflowsWithInAppSteps = useMemo(() => {
    return (
      workflowsData?.workflows?.filter((workflow) => workflow.stepTypeOverviews?.includes(StepTypeEnum.IN_APP)) ?? []
    );
  }, [workflowsData?.workflows]);

  const { mutateAsync: updateWorkflowsWithInAppSteps, isPending: isUpdating } = useMutation({
    mutationFn: async () => {
      if (!workflowsWithInAppSteps.length) return [];

      const workflowsToUpdate = workflowsWithInAppSteps.slice(0, maxToUpdate);
      const results = await Promise.allSettled(
        workflowsToUpdate.map(async (workflow) => {
          await updateWorkflow({
            workflowSlug: workflow.slug,
            workflow: {},
          });
          return workflow.slug;
        })
      );

      return results
        .filter((result) => result.status === 'fulfilled')
        .map((result) => (result as PromiseFulfilledResult<string>).value);
    },
    onSuccess: (updatedWorkflowSlugs) => {
      onSuccess?.(updatedWorkflowSlugs);
    },
  });

  const triggerWorkflowUpdate = useCallback(() => {
    if (enabled && workflowsWithInAppSteps.length > 0) {
      updateWorkflowsWithInAppSteps();
    }
  }, [enabled, workflowsWithInAppSteps.length, updateWorkflowsWithInAppSteps]);

  return {
    workflowsWithInAppSteps,
    triggerWorkflowUpdate,
    isLoading: isLoadingWorkflows,
    isUpdating: isUpdating || isPatching,
    hasWorkflowsWithInAppSteps: workflowsWithInAppSteps.length > 0,
  };
}
