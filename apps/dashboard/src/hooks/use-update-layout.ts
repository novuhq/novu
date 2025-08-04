import { LayoutResponseDto } from '@novu/shared';
import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLayout } from '@/api/layouts';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

export type UpdateLayoutParameters = OmitEnvironmentFromParameters<typeof updateLayout>;

export const useUpdateLayout = (options?: UseMutationOptions<LayoutResponseDto, unknown, UpdateLayoutParameters>) => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: UpdateLayoutParameters) => updateLayout({ environment: currentEnvironment!, ...args }),
    ...options,
    onSuccess: async (data, variables, ctx) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchLayout, currentEnvironment?._id],
      });

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchLayouts, currentEnvironment?._id],
      });

      // Invalidate environment diff cache since layout changes affect environment comparison
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });

      options?.onSuccess?.(data, variables, ctx);
    },
  });

  return {
    ...rest,
    updateLayout: mutateAsync,
  };
};
