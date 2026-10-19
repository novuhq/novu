import { NovuError, TopicSubscription } from '@novu/js';
import { buildSubscriptionIdentifier } from '@novu/js/internal';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNovu } from './NovuProvider';

export type UseSubscriptionProps = {
  topicKey: string;
  identifier?: string;
  onSuccess?: (data: TopicSubscription | null) => void;
  onError?: (error: NovuError) => void;
};

export type UseSubscriptionResult = {
  subscription?: TopicSubscription | null;
  error?: NovuError;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<void>;
};

/**
 * Get a subscription for a topic.
 */
export const useSubscription = (props: UseSubscriptionProps): UseSubscriptionResult => {
  const novu = useNovu();
  const propsRef = useRef<UseSubscriptionProps>(props);
  propsRef.current = {
    ...props,
    identifier:
      props.identifier ?? buildSubscriptionIdentifier({ topicKey: props.topicKey, subscriberId: novu.subscriberId }),
  };
  const [subscription, setSubscription] = useState<TopicSubscription | null>();
  const subscriptionRef = useRef<TopicSubscription | null>(null);
  subscriptionRef.current = subscription ?? null;
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const fetchSubscription = useCallback(
    async (options?: { refetch: boolean }) => {
      const { topicKey, identifier, onSuccess, onError } = propsRef.current;
      if (options?.refetch) {
        setError(undefined);
        setIsLoading(true);
      }

      setIsFetching(true);

      const response = await novu.subscriptions.get(
        {
          topicKey,
          identifier,
        },
        { refetch: options?.refetch }
      );

      if (response.error) {
        setError(response.error);
        onError?.(response.error);
      } else if (response.data !== undefined) {
        onSuccess?.(response.data);
        setSubscription(response.data);
      }
      setIsLoading(false);
      setIsFetching(false);
    },
    [novu]
  );

  useEffect(() => {
    const listener = ({ data: subscription }: { data?: TopicSubscription }) => {
      const { topicKey, identifier } = propsRef.current;
      if (!subscription || subscription.topicKey !== topicKey || subscription.identifier !== identifier) {
        return;
      }

      setSubscription(subscription);
      setIsFetching(false);
    };

    const cleanupGetPending = novu.on('subscription.get.pending', ({ args }) => {
      const { topicKey, identifier } = propsRef.current;
      if (!args || args.topicKey !== topicKey || args.identifier !== identifier) {
        return;
      }
      setIsFetching(true);
    });

    const cleanupGetResolved = novu.on('subscription.get.resolved', ({ args, data, error }) => {
      const { topicKey, identifier, onSuccess, onError } = propsRef.current;
      if (!args || args.topicKey !== topicKey || args.identifier !== identifier) {
        return;
      }
      if (error) {
        setError(error as NovuError);
        onError?.(error as NovuError);
      } else {
        setSubscription(data ?? null);
        onSuccess?.(data ?? null);
      }
      setIsFetching(false);
    });

    const cleanupCreatePending = novu.on('subscription.create.pending', ({ args }) => {
      const { topicKey, identifier } = propsRef.current;
      if (!args || args.topicKey !== topicKey || args.identifier !== identifier) {
        return;
      }
      setIsFetching(true);
    });

    const cleanupCreateResolved = novu.on('subscription.create.resolved', listener);

    const cleanupUpdateResolved = novu.on('subscription.update.resolved', listener);

    const cleanupDeletePending = novu.on('subscription.delete.pending', ({ args }) => {
      const subscriptionId = subscriptionRef.current?.id;
      const subscriptionIdentifier = subscriptionRef.current?.identifier;
      if (!subscriptionId || !subscriptionIdentifier) {
        return;
      }

      if (
        !args ||
        ('subscriptionId' in args &&
          args.subscriptionId !== subscriptionId &&
          args.subscriptionId !== subscriptionIdentifier) ||
        ('subscription' in args &&
          args.subscription.id !== subscriptionId &&
          args.subscription.identifier !== subscriptionIdentifier)
      ) {
        return;
      }
      setIsFetching(true);
    });

    const cleanupDeleteResolved = novu.on('subscription.delete.resolved', ({ args }) => {
      const subscriptionId = subscriptionRef.current?.id;
      const subscriptionIdentifier = subscriptionRef.current?.identifier;
      if (!subscriptionId || !subscriptionIdentifier) {
        return;
      }

      if (
        ('subscriptionId' in args && args.subscriptionId === subscriptionId) ||
        ('subscriptionId' in args && args.subscriptionId === subscriptionIdentifier) ||
        ('subscription' in args && args.subscription.id === subscriptionId) ||
        ('subscription' in args && args.subscription.identifier === subscriptionIdentifier)
      ) {
        setSubscription(null);
        setIsFetching(false);
      }
    });

    void fetchSubscription({ refetch: true });

    return () => {
      cleanupGetPending();
      cleanupGetResolved();
      cleanupCreatePending();
      cleanupCreateResolved();
      cleanupUpdateResolved();
      cleanupDeletePending();
      cleanupDeleteResolved();
    };
  }, [novu, fetchSubscription]);

  const refetch = useCallback(() => fetchSubscription({ refetch: true }), [fetchSubscription]);

  return {
    subscription,
    error,
    isLoading,
    isFetching,
    refetch,
  };
};
