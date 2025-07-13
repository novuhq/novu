import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { LayoutResponseDto } from '@novu/shared';
import { useEnvironment } from '@/context/environment/hooks';
import { updateLayout } from '@/api/layouts';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type UpdateLayoutParameters = OmitEnvironmentFromParameters<typeof updateLayout>;

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

      options?.onSuccess?.(data, variables, ctx);
    },
  });

  return {
    ...rest,
    updateLayout: mutateAsync,
  };
};
