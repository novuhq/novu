import { addSubscribersToTopic, getTopicSubscriptions, removeSubscribersFromTopic } from '@/api/topics';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useTopicSubscriptions(
  topicKey: string,
  {
    limit = 100,
    after,
    before,
    subscriberId,
  }: {
    limit?: number;
    after?: string;
    before?: string;
    subscriberId?: string;
  } = {}
) {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: ['topic-subscriptions', currentEnvironment?._id, topicKey, { limit, after, before, subscriberId }],
    queryFn: async () => {
      if (!currentEnvironment) {
        throw new Error('Environment not found');
      }

      return getTopicSubscriptions({
        environment: currentEnvironment,
        topicKey,
        limit,
        after,
        before,
        subscriberId,
      });
    },
    enabled: !!currentEnvironment && !!topicKey,
    placeholderData: keepPreviousData,
  });
}

export function useAddTopicSubscribers() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topicKey, subscribers }: { topicKey: string; subscribers: string[] }) => {
      if (!currentEnvironment) {
        throw new Error('Environment not found');
      }

      return addSubscribersToTopic({
        environment: currentEnvironment,
        topicKey,
        subscribers,
      });
    },
    onSuccess: (result, variables) => {
      // Invalidate the topic query to refresh the data
      queryClient.invalidateQueries({
        queryKey: ['topic', currentEnvironment?._id, variables.topicKey],
      });

      // Invalidate topic subscriptions query
      queryClient.invalidateQueries({
        queryKey: ['topic-subscriptions', currentEnvironment?._id, variables.topicKey],
      });

      showSuccessToast('Subscriber was added');
    },
    onError: () => {
      showErrorToast('Error', 'Failed to add subscribers to topic');
    },
  });
}

export function useRemoveTopicSubscriber() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ topicKey, subscriberId }: { topicKey: string; subscriberId: string }) => {
      if (!currentEnvironment) {
        throw new Error('Environment not found');
      }

      return removeSubscribersFromTopic({
        environment: currentEnvironment,
        topicKey,
        subscribers: [subscriberId],
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate the topic query to refresh the data
      queryClient.invalidateQueries({
        queryKey: ['topic', currentEnvironment?._id, variables.topicKey],
      });

      // Invalidate topic subscriptions query
      queryClient.invalidateQueries({
        queryKey: ['topic-subscriptions', currentEnvironment?._id, variables.topicKey],
      });

      showSuccessToast('Subscriber removed', 'Successfully removed subscriber from topic');
    },
    onError: () => {
      showErrorToast('Error', 'Failed to remove subscriber from topic');
    },
  });
}
