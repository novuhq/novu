import type { WorkflowResponseDto } from '@novu/shared';
import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { updateWorkflow } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';
import { getIdFromSlug, WORKFLOW_DIVIDER } from '@/utils/id-utils';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type UpdateWorkflowParameters = OmitEnvironmentFromParameters<typeof updateWorkflow>;

/**
 * This function marks the new steps in the workflow by comparing the previous workflow with the current one
 *
 * It is used to prevent the validation errors from being shown on the first render of a new step
 *
 * NOTE: This solution doesn't work in development mode because of React Strict Mode that causes the workflow to be patched twice on step addition
 * @param previousWorkflow
 * @param currentWorkflow
 * @returns
 */
function markNewSteps(previousWorkflow: WorkflowResponseDto, currentWorkflow: WorkflowResponseDto) {
  if (!previousWorkflow || !currentWorkflow) {
    return currentWorkflow;
  }

  const previousStepIds = new Set(previousWorkflow.steps.map((step) => step.stepId));

  currentWorkflow.steps.forEach((step) => {
    if (!previousStepIds.has(step.stepId)) {
      // @ts-expect-error - isNew doesn't exist on StepResponseDto and it's too much work to override the @novu/shared types now
      step.isNew = true;
    }
  });

  return currentWorkflow;
}

export const useUpdateWorkflow = (
  options?: UseMutationOptions<WorkflowResponseDto, unknown, UpdateWorkflowParameters>
) => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (args: UpdateWorkflowParameters) => updateWorkflow({ environment: currentEnvironment!, ...args }),
    ...options,
    onSuccess: async (data, variables, context) => {
      const workflowId = getIdFromSlug({ slug: data.slug, divider: WORKFLOW_DIVIDER });
      const previousData = await queryClient.getQueryData<WorkflowResponseDto>([
        QueryKeys.fetchWorkflow,
        currentEnvironment?._id,
        workflowId,
      ]);

      if (previousData) {
        markNewSteps(previousData, data);
      }

      await queryClient.setQueryData([QueryKeys.fetchWorkflow, currentEnvironment?._id, workflowId], data);
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchWorkflowTestData, currentEnvironment?._id, workflowId],
      });

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchWorkflows],
      });

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });

      options?.onSuccess?.(data, variables, context);
    },
  });

  return {
    ...mutation,
    updateWorkflow: mutation.mutateAsync,
  };
};
