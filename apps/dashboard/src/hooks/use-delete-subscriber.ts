import { deleteSubscriber } from '@/api/subscribers';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';
import { RemoveSubscriberResponseDto } from '@novu/api/models/components';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';

type DeleteSubscriberParameters = OmitEnvironmentFromParameters<typeof deleteSubscriber>;

export const useDeleteSubscriber = (
  options?: UseMutationOptions<RemoveSubscriberResponseDto, unknown, DeleteSubscriberParameters>
) => {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: DeleteSubscriberParameters) => deleteSubscriber({ environment: currentEnvironment!, ...args }),
    ...options,
    onSuccess: async (data, variables, ctx) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchSubscribers],
      });

      options?.onSuccess?.(data, variables, ctx);
    },
  });

  return {
    ...rest,
    deleteSubscriber: mutateAsync,
  };
};
