import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { LayoutResponseDto } from '@novu/shared';
import { useEnvironment } from '@/context/environment/hooks';
import { duplicateLayout } from '@/api/layouts';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type DuplicateLayoutParameters = OmitEnvironmentFromParameters<typeof duplicateLayout>;

export const useDuplicateLayout = (
  options?: UseMutationOptions<LayoutResponseDto, unknown, DuplicateLayoutParameters>
) => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: DuplicateLayoutParameters) => duplicateLayout({ environment: currentEnvironment!, ...args }),
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
    duplicateLayout: mutateAsync,
  };
};
