import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteEnvironmentVariable } from '@/api/environment-variables';
import { QueryKeys } from '@/utils/query-keys';

type DeleteEnvironmentVariableArgs = {
  variableId: string;
};

export const useDeleteEnvironmentVariable = (
  options?: UseMutationOptions<void, unknown, DeleteEnvironmentVariableArgs>
) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: ({ variableId }: DeleteEnvironmentVariableArgs) => deleteEnvironmentVariable(variableId),
    ...options,
    onSuccess: async (_, variables, ctx) => {
      queryClient.removeQueries({ queryKey: [QueryKeys.fetchEnvironmentVariable, variables.variableId], exact: true });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchEnvironmentVariables],
        exact: false,
        refetchType: 'all',
      });
      options?.onSuccess?.(_, variables, ctx);
    },
  });

  return {
    ...rest,
    deleteEnvironmentVariable: mutateAsync,
  };
};
