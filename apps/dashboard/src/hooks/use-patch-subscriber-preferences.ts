import { patchSubscriberPreferences } from '@/api/subscribers';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';
import { GetSubscriberPreferencesDto } from '@novu/api/models/components';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';

type PatchSubscriberPreferencesParameters = OmitEnvironmentFromParameters<typeof patchSubscriberPreferences>;

export const usePatchSubscriberPreferences = (
  options?: UseMutationOptions<GetSubscriberPreferencesDto, unknown, PatchSubscriberPreferencesParameters>
) => {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: PatchSubscriberPreferencesParameters) =>
      patchSubscriberPreferences({ environment: currentEnvironment!, ...args }),
    ...options,
    onSuccess: async (data, variables, ctx) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchSubscriberPreferences],
      });

      options?.onSuccess?.(data, variables, ctx);
    },
  });

  return {
    ...rest,
    patchSubscriberPreferences: mutateAsync,
  };
};
