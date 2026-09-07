import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ChannelEndpointDto, updateChannelEndpoint } from '@/api/channel-endpoints';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type UpdateChannelEndpointParameters = OmitEnvironmentFromParameters<typeof updateChannelEndpoint>;

export const useUpdateChannelEndpoint = (
  options?: UseMutationOptions<ChannelEndpointDto, unknown, UpdateChannelEndpointParameters>
) => {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: UpdateChannelEndpointParameters) =>
      updateChannelEndpoint({ environment: currentEnvironment!, ...args }),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.fetchChannelEndpoints, currentEnvironment?._id, variables.subscriberId],
        }),
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.fetchSubscriber, currentEnvironment?._id, variables.subscriberId],
        }),
      ]);

      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });

  return {
    ...rest,
    updateChannelEndpoint: mutateAsync,
  };
};
