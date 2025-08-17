import { RemoveSubscriberResponseDto } from '@novu/api/models/components';
import { UseMutationOptions, useMutation } from '@tanstack/react-query';
import { deleteSubscriber } from '@/api/subscribers';
import { useEnvironment } from '@/context/environment/hooks';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type DeleteSubscriberParameters = OmitEnvironmentFromParameters<typeof deleteSubscriber>;

export const useDeleteSubscriber = (
  options?: UseMutationOptions<RemoveSubscriberResponseDto, unknown, DeleteSubscriberParameters>
) => {
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, ...rest } = useMutation({
    mutationFn: (args: DeleteSubscriberParameters) => deleteSubscriber({ environment: currentEnvironment!, ...args }),
    ...options,
    onSuccess: (data, variables, ctx) => {
      options?.onSuccess?.(data, variables, ctx);
    },
  });

  return {
    ...rest,
    deleteSubscriber: mutateAsync,
  };
};
