import { SubscriberResponseDto } from '@novu/api/models/components';
import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSubscriber } from '@/api/subscribers';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

export type CreateSubscriberParameters = OmitEnvironmentFromParameters<typeof createSubscriber>;

export const useCreateSubscriber = (
  options?: UseMutationOptions<SubscriberResponseDto, unknown, CreateSubscriberParameters>
) => {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: CreateSubscriberParameters) => createSubscriber({ environment: currentEnvironment!, ...args }),
    ...options,
    onSuccess: async (data, variables, ctx) => {
      queryClient.invalidateQueries({
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
