import { SubscriberResponseDto } from '@novu/api/models/components';
import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { upsertSubscriberCredentials } from '@/api/subscriber-credentials';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type UpsertSubscriberCredentialsParameters = OmitEnvironmentFromParameters<typeof upsertSubscriberCredentials>;

export const useUpdateSubscriberCredentials = (
  options?: UseMutationOptions<SubscriberResponseDto, unknown, UpsertSubscriberCredentialsParameters>
) => {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: UpsertSubscriberCredentialsParameters) =>
      upsertSubscriberCredentials({ environment: currentEnvironment!, ...args }),
    ...options,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchSubscriber, currentEnvironment?._id, variables.subscriberId],
      });

      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
  });

  return {
    ...rest,
    updateSubscriberCredentials: mutateAsync,
  };
};
