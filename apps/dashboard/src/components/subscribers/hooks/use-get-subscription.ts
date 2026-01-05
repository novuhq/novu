import { UseQueryOptions, UseQueryResult, useQuery } from '@tanstack/react-query';
import { getTopicSubscription, TopicSubscriptionDetailsResponse } from '@/api/topics';
import { useEnvironment } from '@/context/environment/hooks';

export const useGetSubscription = ({
  topicKey,
  subscriptionId,
  options,
}: {
  topicKey?: string;
  subscriptionId?: string;
  options?: Omit<UseQueryOptions<TopicSubscriptionDetailsResponse, Error>, 'queryKey' | 'queryFn'>;
}): UseQueryResult<TopicSubscriptionDetailsResponse, Error> => {
  const { enabled = true } = options || {};
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: ['subscription-preferences', currentEnvironment?._id, topicKey, subscriptionId],
    queryFn: () => {
      if (!currentEnvironment || !topicKey || !subscriptionId) {
        throw new Error('Environment, topicKey, subscriberId, and subscriptionId are required');
      }

      return getTopicSubscription({ environment: currentEnvironment, topicKey, subscriptionId });
    },
    enabled: enabled && !!currentEnvironment && !!topicKey && !!subscriptionId,
    ...options,
  });
};
