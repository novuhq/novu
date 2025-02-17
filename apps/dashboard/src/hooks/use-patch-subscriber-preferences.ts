import { patchSubscriberPreferences } from '@/api/subscribers';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';
import { GetSubscriberPreferencesDto } from '@novu/api/models/components';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';

type PatchSubscriberPreferencesParameters = OmitEnvironmentFromParameters<typeof patchSubscriberPreferences>;

export const usePatchSubscriberPreferences = (
  options?: UseMutationOptions<GetSubscriberPreferencesDto, unknown, PatchSubscriberPreferencesParameters>
) => {
  const { onSuccess, ...restOptions } = options ?? {};
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: PatchSubscriberPreferencesParameters) =>
      patchSubscriberPreferences({ environment: currentEnvironment!, ...args }),
    onSuccess: async (data, variables, ctx) => {
      await queryClient.invalidateQueries({
        queryKey: [
          QueryKeys.fetchSubscriberPreferences,
          currentOrganization?._id,
          currentEnvironment?._id,
          variables.subscriberId,
        ],
      });

      onSuccess?.(data, variables, ctx);
    },
    ...restOptions,
  });

  return {
    ...rest,
    patchSubscriberPreferences: mutateAsync,
  };
};
