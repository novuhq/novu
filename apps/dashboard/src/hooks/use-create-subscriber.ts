import { createSubscriber } from '@/api/subscribers';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';
import { SubscriberResponseDto } from '@novu/api/models/components';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';

type CreateSubscriberParameters = OmitEnvironmentFromParameters<typeof createSubscriber>;

export const useCreateSubscriber = (
  options?: UseMutationOptions<SubscriberResponseDto, unknown, CreateSubscriberParameters>
) => {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: CreateSubscriberParameters) => createSubscriber({ environment: currentEnvironment!, ...args }),
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
    createSubscriber: mutateAsync,
  };
};
