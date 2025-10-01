// Removed unused imports
import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { ContextResponseDto, updateContext } from '@/api/contexts';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

export type UpdateContextParameters = OmitEnvironmentFromParameters<typeof updateContext>;

export const useUpdateContext = (
  options?: UseMutationOptions<ContextResponseDto, unknown, UpdateContextParameters>
) => {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: UpdateContextParameters) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment available');
      return updateContext({ environment, ...args });
    },
    ...options,
    onSuccess: async (data, variables, ctx) => {
      // Invalidate contexts list queries
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchContexts] });

      // Invalidate specific context query
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchContext, currentEnvironment?._id, data.type, data.id],
      });

      options?.onSuccess?.(data, variables, ctx);
    },
  });

  return {
    ...rest,
    updateContext: mutateAsync,
  };
};
