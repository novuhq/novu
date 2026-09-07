import { NovuError, TopicSubscription } from '@novu/js';
import { useCallback, useEffect, useState } from 'react';
import { useNovu } from './NovuProvider';

/**
 * Get all subscriptions for a topic.
 * Props for the useSubscriptions hook.
 *
 * @example
 * ```tsx
 * // Get all subscriptions for a topic
 * const { subscriptions } = useSubscriptions({
 *   topicKey: 'my-topic'
 * });
 *
 * // Get subscriptions with callbacks
 * const { subscriptions, refetch } = useSubscriptions({
 *   topicKey: 'my-topic',
 *   onSuccess: (data) => console.log('Loaded:', data),
 *   onError: (error) => console.error('Error:', error)
 * });
 * ```
 */
export type UseSubscriptionsProps = {
  topicKey: string;
  onSuccess?: (data: TopicSubscription[]) => void;
  onError?: (error: NovuError) => void;
};

export type UseSubscriptionsResult = {
  subscriptions?: TopicSubscription[];
  error?: NovuError;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<void>;
};

export const useSubscriptions = ({ topicKey, onSuccess, onError }: UseSubscriptionsProps): UseSubscriptionsResult => {
  const novu = useNovu();
  const [data, setData] = useState<TopicSubscription[]>();
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const fetchSubscriptions = useCallback(
    async (options?: { refetch: boolean }) => {
      if (options?.refetch) {
        setError(undefined);
        setIsLoading(true);
        novu.subscriptions.cache.invalidate({ topicKey });
      }
      setIsFetching(true);

      const response = await novu.subscriptions.list({ topicKey }, { refetch: options?.refetch });

      if (response.error) {
        setError(response.error);
        onError?.(response.error);
      } else if (response.data) {
        onSuccess?.(response.data);
        setData(response.data);
      }
      setIsLoading(false);
      setIsFetching(false);
    },
    [novu, topicKey, onError, onSuccess]
  );

  useEffect(() => {
    const cleanupListPending = novu.on('subscriptions.list.pending', ({ args }) => {
      if (args.topicKey !== topicKey) {
        return;
      }
      setIsFetching(true);
    });

    const cleanupListResolved = novu.on('subscriptions.list.resolved', ({ args, data, error }) => {
      if (args.topicKey !== topicKey) {
        return;
      }
      if (error) {
        setError(error as NovuError);
        onError?.(error as NovuError);
      } else if (data) {
        onSuccess?.(data);
        setData(data);
      }
      setIsLoading(false);
      setIsFetching(false);
    });

    const cleanupListUpdated = novu.on('subscriptions.list.updated', ({ data }) => {
      if (data.topicKey !== topicKey) {
        return;
      }
      setData(data.subscriptions);
    });

    const cleanupCreateResolved = novu.on('subscription.create.resolved', ({ args, data }) => {
      if (args.topicKey !== topicKey) {
        return;
      }
      if (data) {
        void fetchSubscriptions({ refetch: true });
      }
    });

    const cleanupDeleteResolved = novu.on('subscription.delete.resolved', ({ args }) => {
      const deleteTopicKey = 'subscription' in args ? args.subscription.topicKey : topicKey;
      if (deleteTopicKey !== topicKey) {
        return;
      }
      void fetchSubscriptions({ refetch: true });
    });

    void fetchSubscriptions({ refetch: true });

    return () => {
      cleanupListPending();
      cleanupListResolved();
      cleanupListUpdated();
      cleanupCreateResolved();
      cleanupDeleteResolved();
    };
  }, [topicKey, novu, fetchSubscriptions, onError, onSuccess]);

  const refetch = useCallback(() => {
    return fetchSubscriptions({ refetch: true });
  }, [fetchSubscriptions]);

  return {
    subscriptions: data,
    error,
    isLoading,
    isFetching,
    refetch,
  };
};
