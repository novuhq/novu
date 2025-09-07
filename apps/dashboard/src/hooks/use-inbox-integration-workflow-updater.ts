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
  // Validate maxToUpdate parameter
  if (!Number.isInteger(maxToUpdate) || maxToUpdate <= 0) {
    throw new Error('maxToUpdate must be a positive integer');
  }
  const { data: workflowsData, isLoading: isLoadingWorkflows } = useFetchWorkflows({
    limit: 20,
    offset: 0,
    query: '',
  });

  const { patchWorkflow, isPending: isPatching } = usePatchWorkflow();

  // Filter workflows that have in-app steps
  const workflowsWithInAppSteps = useMemo(() => {
    if (!workflowsData?.workflows) return [];

    return workflowsData.workflows.filter((workflow) => {
      // Check if workflow has in-app steps by looking at stepTypeOverviews
      return workflow.stepTypeOverviews?.includes(StepTypeEnum.IN_APP);
    });
  }, [workflowsData?.workflows]);

  // Mutation to update workflows with in-app steps (limited to maxToUpdate PATCH requests)
  const { mutateAsync: updateWorkflowsWithInAppSteps, isPending: isUpdating } = useMutation({
    mutationFn: async () => {
      if (!workflowsWithInAppSteps.length) {
        return [];
      }

      // Limit to maximum configured number of PATCH requests
      const workflowsToUpdate = workflowsWithInAppSteps.slice(0, maxToUpdate);

      const updatePromises = workflowsToUpdate.map(async (workflow) => {
        // Patch the workflow - sending empty object to trigger without changes
        await patchWorkflow({
          workflowSlug: workflow.slug,
          workflow: {},
        });
        return workflow.slug;
      });

      const results = await Promise.allSettled(updatePromises);

      // Collect only successful slugs
      const successfulSlugs: string[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          successfulSlugs.push(result.value);
        }
      }

      return successfulSlugs;
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
