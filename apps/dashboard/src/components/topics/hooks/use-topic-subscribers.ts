import { addSubscribersToTopic, removeSubscribersFromTopic } from '@/api/topics';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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

      if (result.succeeded.length > 0) {
        showSuccessToast('Subscriber was successfully added');
      }

      if (result.failed?.notFound.length) {
        showErrorToast('Subscriber was not found');
      }
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

      showSuccessToast('Subscriber removed', 'Successfully removed subscriber from topic');
    },
    onError: () => {
      showErrorToast('Error', 'Failed to remove subscriber from topic');
    },
  });
}
