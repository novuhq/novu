import { SubscriberResponseDto } from '@novu/api/models/components';
import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteSubscriberCredentials } from '@/api/subscriber-credentials';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type DeleteSubscriberCredentialsParameters = OmitEnvironmentFromParameters<typeof deleteSubscriberCredentials>;

export const useDeleteSubscriberCredentials = (
  options?: UseMutationOptions<SubscriberResponseDto, unknown, DeleteSubscriberCredentialsParameters>
) => {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: DeleteSubscriberCredentialsParameters) =>
      deleteSubscriberCredentials({ environment: currentEnvironment!, ...args }),
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
    deleteSubscriberCredentials: mutateAsync,
  };
};
