/**
 * Hook to update workflows with in-app steps when inbox integration is connected.
 *
 * This hook:
 * 1. Fetches all workflows in the organization
 * 2. Filters workflows that have in-app steps
 * 3. Triggers a PATCH request to update those workflows when called
 *
 * Usage:
 * ```tsx
 * const { triggerWorkflowUpdate, hasWorkflowsWithInAppSteps } = useInboxIntegrationWorkflowUpdater({
 *   onSuccess: (updatedWorkflowSlugs) => {
 *     console.log('Updated workflows:', updatedWorkflowSlugs);
 *   },
 *   onError: (error) => {
 *     console.error('Failed to update workflows:', error);
 *   },
 * });
 *
 * // Trigger when inbox integration is connected
 * useEffect(() => {
 *   if (foundIntegration?.connected && hasWorkflowsWithInAppSteps) {
 *     triggerWorkflowUpdate();
 *   }
 * }, [foundIntegration?.connected, hasWorkflowsWithInAppSteps, triggerWorkflowUpdate]);
 * ```
 *
 * To customize the workflow update payload, modify the `workflow` object in the `patchWorkflow` call
 * within the `mutationFn`. You can add any fields from the `PatchWorkflowDto` interface.
 */

import { StepTypeEnum } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useFetchWorkflows } from './use-fetch-workflows';
import { usePatchWorkflow } from './use-patch-workflow';

interface UseInboxIntegrationWorkflowUpdaterOptions {
  enabled?: boolean;
  onSuccess?: (updatedWorkflows: string[]) => void;
  onError?: (error: Error) => void;
}

export function useInboxIntegrationWorkflowUpdater({
  enabled = true,
  onSuccess,
  onError,
}: UseInboxIntegrationWorkflowUpdaterOptions = {}) {
  // Fetch all workflows
  const { data: workflowsData, isLoading: isLoadingWorkflows } = useFetchWorkflows({
    limit: 1000, // Get all workflows
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

  // Mutation to update workflows with in-app steps (limited to 20 PATCH requests)
  const { mutateAsync: updateWorkflowsWithInAppSteps, isPending: isUpdating } = useMutation({
    mutationFn: async () => {
      if (!workflowsWithInAppSteps.length) {
        return [];
      }

      // Limit to maximum 20 PATCH requests
      const workflowsToUpdate = workflowsWithInAppSteps.slice(0, 20);

      const updatePromises = workflowsToUpdate.map(async (workflow) => {
        try {
          // Patch the workflow - sending empty object to trigger without changes
          await patchWorkflow({
            workflowSlug: workflow.slug,
            workflow: {
              // Empty object - no actual changes, just triggers the PATCH request
            },
          });
          return workflow.slug;
        } catch (error) {
          console.error(`Failed to update workflow ${workflow.slug}:`, error);
          throw error;
        }
      });

      return Promise.all(updatePromises);
    },
    onSuccess: (updatedWorkflowSlugs) => {
      onSuccess?.(updatedWorkflowSlugs);
    },
    onError: (error) => {
      onError?.(error as Error);
    },
  });

  // Function to trigger the update
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
