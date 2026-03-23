import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreateEnvironmentVariableDto,
  createEnvironmentVariable,
  EnvironmentVariableResponseDto,
} from '@/api/environment-variables';
import { QueryKeys } from '@/utils/query-keys';

export const useCreateEnvironmentVariable = (
  options?: UseMutationOptions<EnvironmentVariableResponseDto, unknown, CreateEnvironmentVariableDto>
) => {
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: CreateEnvironmentVariableDto) => createEnvironmentVariable(args),
    ...options,
    onSuccess: async (data, variables, ctx) => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchEnvironmentVariables] });
      options?.onSuccess?.(data, variables, ctx);
    },
  });

  return {
    ...rest,
    createEnvironmentVariable: mutateAsync,
  };
};
