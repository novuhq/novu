import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { ContextResponseDto, createContext } from '@/api/contexts';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

export type CreateContextParameters = OmitEnvironmentFromParameters<typeof createContext>;

export const useCreateContext = (
  options?: UseMutationOptions<ContextResponseDto, unknown, CreateContextParameters>
) => {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: CreateContextParameters) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment available');
      return createContext({ environment, ...args });
    },
    ...options,
    onSuccess: async (data, variables, ctx) => {
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchContexts],
      });

      options?.onSuccess?.(data, variables, ctx);
    },
  });

  return {
    ...rest,
    createContext: mutateAsync,
  };
};
