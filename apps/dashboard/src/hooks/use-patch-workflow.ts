import { OmitEnvironmentFromParameters } from '@/utils/types';
import { patchWorkflow } from '@/api/workflows';
import { QueryKeys } from '@/utils/query-keys';
import { useEnvironment } from '@/context/environment/hooks';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import type { WorkflowResponseDto } from '@novu/shared';

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

      options?.onSuccess?.(data, variables, ctx);
    },
  });

  return {
    ...rest,
    patchWorkflow: mutateAsync,
  };
};
