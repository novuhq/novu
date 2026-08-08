import { UseQueryOptions, UseQueryResult, useQuery } from '@tanstack/react-query';
import { getTopicSubscription, TopicSubscriptionDetailsResponse } from '@/api/topics';
import { useEnvironment } from '@/context/environment/hooks';

export const useGetSubscription = ({
  topicKey,
  subscriptionIdentifier,
  options,
}: {
  topicKey?: string;
  subscriptionIdentifier?: string;
  options?: Omit<UseQueryOptions<TopicSubscriptionDetailsResponse | null, Error>, 'queryKey' | 'queryFn'>;
}): UseQueryResult<TopicSubscriptionDetailsResponse | null, Error> => {
  const { enabled = true } = options || {};
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: ['subscription-preferences', currentEnvironment?._id, topicKey, subscriptionIdentifier],
    queryFn: () => {
      if (!currentEnvironment || !topicKey || !subscriptionIdentifier) {
        throw new Error('Environment, topicKey, and subscriptionIdentifier are required');
      }

      return getTopicSubscription({ environment: currentEnvironment, topicKey, subscriptionIdentifier });
    },
    enabled: enabled && !!currentEnvironment && !!topicKey && !!subscriptionIdentifier,
    ...options,
  });
};
