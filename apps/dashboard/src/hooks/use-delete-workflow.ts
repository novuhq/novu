import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteWorkflow } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type DeleteWorkflowParameters = OmitEnvironmentFromParameters<typeof deleteWorkflow>;

export const useDeleteWorkflow = (options?: UseMutationOptions<void, unknown, DeleteWorkflowParameters>) => {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: DeleteWorkflowParameters) => deleteWorkflow({ environment: currentEnvironment!, ...args }),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchWorkflows],
      });

      // Invalidate diff environment queries when workflows are deleted
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });

      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });

  return {
    ...rest,
    deleteWorkflow: mutateAsync,
  };
};
