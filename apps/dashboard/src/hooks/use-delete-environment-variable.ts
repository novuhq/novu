import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteEnvironmentVariable } from '@/api/environment-variables';
import { QueryKeys } from '@/utils/query-keys';

type DeleteEnvironmentVariableArgs = {
  variableKey: string;
};

export const useDeleteEnvironmentVariable = (
  options?: UseMutationOptions<void, unknown, DeleteEnvironmentVariableArgs>
) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: ({ variableKey }: DeleteEnvironmentVariableArgs) => deleteEnvironmentVariable(variableKey),
    ...options,
    onSuccess: async (_, variables, onMutateResult, context) => {
      queryClient.removeQueries({ queryKey: [QueryKeys.fetchEnvironmentVariable, variables.variableKey], exact: true });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchEnvironmentVariables],
        exact: false,
        refetchType: 'all',
      });
      options?.onSuccess?.(_, variables, onMutateResult, context);
    },
  });

  return {
    ...rest,
    deleteEnvironmentVariable: mutateAsync,
  };
};
