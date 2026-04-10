import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  EnvironmentVariableResponseDto,
  UpdateEnvironmentVariableDto,
  updateEnvironmentVariable,
} from '@/api/environment-variables';
import { QueryKeys } from '@/utils/query-keys';

type UpdateEnvironmentVariableArgs = {
  variableKey: string;
} & UpdateEnvironmentVariableDto;

export const useUpdateEnvironmentVariable = (
  options?: UseMutationOptions<EnvironmentVariableResponseDto, unknown, UpdateEnvironmentVariableArgs>
) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: ({ variableKey, ...body }: UpdateEnvironmentVariableArgs) =>
      updateEnvironmentVariable(variableKey, body),
    ...options,
    onSuccess: async (data, variables, ctx) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchEnvironmentVariables] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchEnvironmentVariable, variables.variableKey] });
      options?.onSuccess?.(data, variables, ctx);
    },
  });

  return {
    ...rest,
    updateEnvironmentVariable: mutateAsync,
  };
};
