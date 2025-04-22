import { addSubscribersToTopic } from '@/api/topics';
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
        showSuccessToast(
          'Subscribers added',
          `Successfully added ${result.succeeded.length} subscriber${result.succeeded.length > 1 ? 's' : ''}`
        );
      }

      if (result.failed?.notFound.length) {
        showErrorToast(
          'Some subscribers not found',
          `Failed to add ${result.failed.notFound.length} subscriber(s): not found`
        );
      }
    },
    onError: () => {
      showErrorToast('Error', 'Failed to add subscribers to topic');
    },
  });
}
