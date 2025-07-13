import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { deleteLayout } from '@/api/layouts';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type DeleteLayoutParameters = OmitEnvironmentFromParameters<typeof deleteLayout>;

export const useDeleteLayout = (options?: UseMutationOptions<void, unknown, DeleteLayoutParameters>) => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: DeleteLayoutParameters) => deleteLayout({ environment: currentEnvironment!, ...args }),
    ...options,
    onSuccess: async (data, variables, ctx) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchLayouts, currentEnvironment?._id],
      });

      options?.onSuccess?.(data, variables, ctx);
    },
  });

  return {
    ...rest,
    deleteLayout: mutateAsync,
  };
};
