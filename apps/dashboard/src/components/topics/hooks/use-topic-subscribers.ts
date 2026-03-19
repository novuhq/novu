import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NovuApiError } from '@/api/api.client';
import { addSubscribersToTopic, getTopicSubscriptions, removeSubscribersFromTopic } from '@/api/topics';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';

export function useTopicSubscriptions(
  topicKey: string,
  {
    limit = 100,
    after,
    before,
    subscriberId,
    contextKeys,
  }: {
    limit?: number;
    after?: string;
    before?: string;
    subscriberId?: string;
    contextKeys?: string[];
  } = {}
) {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: [
      'topic-subscriptions',
      currentEnvironment?._id,
      topicKey,
      { limit, after, before, subscriberId, contextKeys },
    ],
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
        contextKeys,
      });
    },
    retry: false,
    enabled: !!currentEnvironment && !!topicKey,
    placeholderData: keepPreviousData,
  });
}

export function useAddTopicSubscribers() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      topicKey,
      subscribers,
      contextKeys,
    }: {
      topicKey: string;
      subscribers: string[];
      contextKeys?: string[];
    }) => {
      if (!currentEnvironment) {
        throw new Error('Environment not found');
      }

      return addSubscribersToTopic({
        environment: currentEnvironment,
        topicKey,
        subscribers,
        contextKeys,
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

      showSuccessToast('Subscriber was added');
    },
    onError: (error: NovuApiError) => {
      // Extract error information from the API response
      const errorResponse = error?.rawError as {
        errors?: Array<{
          subscriberId: string;
          code: string;
          message: string;
        }>;
      };

      if (errorResponse?.errors && errorResponse.errors.length > 0) {
        const firstError = errorResponse.errors[0];
        const errorCode = firstError.code;
        const errorMessage = firstError.message;
        const subscriberId = firstError.subscriberId;

        // Create a user-friendly error message based on the error code
        let displayMessage = errorMessage;

        if (errorCode === 'SUBSCRIBER_NOT_FOUND') {
          displayMessage = `Subscriber '${subscriberId}' could not be found. Please check the ID and try again.`;
        }

        showErrorToast(displayMessage, 'Failed to add subscriber');
      } else {
        // Fallback error message if we can't extract specific error details
        showErrorToast('Failed to add subscriber to topic. Please try again.');
      }
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
