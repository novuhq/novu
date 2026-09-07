import { UseMutationOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeleteTopicSubscriptionsResponseDto, deleteTopicSubscription } from '@/api/topics';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export const useDeleteSubscription = (
  options?: UseMutationOptions<
    DeleteTopicSubscriptionsResponseDto,
    unknown,
    { topicKey: string; identifier: string; subscriberId: string }
  >
) => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      topicKey,
      identifier,
      subscriberId,
    }: {
      topicKey: string;
      identifier: string;
      subscriberId: string;
    }) => deleteTopicSubscription({ environment: currentEnvironment!, topicKey, identifier, subscriberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchSubscriberSubscriptions, currentEnvironment?._id] });
    },
    ...options,
  });
};
