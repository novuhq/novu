import type { WorkflowResponseDto } from '@novu/shared';
import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { patchWorkflow } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type PatchWorkflowParameters = OmitEnvironmentFromParameters<typeof patchWorkflow>;

export const usePatchWorkflow = (
  options?: UseMutationOptions<WorkflowResponseDto, unknown, PatchWorkflowParameters>
) => {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: PatchWorkflowParameters) => patchWorkflow({ environment: currentEnvironment!, ...args }),
    ...options,
    onSuccess: async (data, variables, ctx) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchWorkflows],
      });

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });

      options?.onSuccess?.(data, variables, ctx);
    },
  });

  return {
    ...rest,
    patchWorkflow: mutateAsync,
  };
};
