import type { CreateSubscriptionArgs } from '@novu/js';
import { NovuError, TopicSubscription } from '@novu/js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNovu } from './NovuProvider';

/**
 * Get a subscription for a topic.
 * Props for the useSubscription hook.
 *
 * @example
 * ```tsx
 * // Get a subscription
 * const { subscription, create, remove } = useSubscription({
 *   topicKey: 'my-topic',
 *   identifier: 'user-123'
 * });
 *
 * // Create a subscription
 * await create({
 *   topicKey: 'my-topic',
 *   identifier: 'user-123',
 *   filters: [{ workflowId: 'workflow-1' }]
 * });
 *
 * // Delete a subscription
 * await remove({ subscriptionId: subscription?.id });
 * ```
 */
export type UseSubscriptionProps = {
  topicKey: string;
  identifier?: string;
  filters: CreateSubscriptionArgs['filters'];
  onSuccess?: (data: TopicSubscription | null) => void;
  onError?: (error: NovuError) => void;
};

export type UseSubscriptionResult = {
  subscription?: TopicSubscription | null;
  error?: NovuError;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<void>;
  create: () => Promise<{
    data?: TopicSubscription | undefined;
    error?: NovuError | undefined;
  }>;
  remove: () => Promise<{
    data?: void | undefined;
    error?: NovuError | undefined;
  }>;
};

export const useSubscription = ({
  topicKey,
  identifier,
  filters,
  onSuccess,
  onError,
}: UseSubscriptionProps): UseSubscriptionResult => {
  const novu = useNovu();
  const optionsRef = useRef<Omit<UseSubscriptionProps, 'onSuccess' | 'onError'>>({
    topicKey,
    identifier,
    filters,
  });
  optionsRef.current = { topicKey, identifier, filters };
  const [subscription, setSubscription] = useState<TopicSubscription | null>();
  const subscriptionRef = useRef<TopicSubscription | null>(null);
  subscriptionRef.current = subscription ?? null;
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const fetchSubscription = useCallback(
    async (options?: { refetch: boolean }) => {
      if (options?.refetch) {
        setError(undefined);
        setIsLoading(true);
      }

      setIsFetching(true);

      const response = await novu.subscriptions.get({
        topicKey,
        identifier,
      });

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
    [novu, topicKey, identifier, onError, onSuccess]
  );

  useEffect(() => {
    const listener = ({ data: subscription }: { data?: TopicSubscription }) => {
      if (!subscription || subscription.topicKey !== topicKey || subscription.identifier !== identifier) {
        return;
      }

      setSubscription(subscription);
      setIsFetching(false);
    };

    const cleanupGetPending = novu.on('subscription.get.pending', ({ args }) => {
      if (!args || args.topicKey !== topicKey || args.identifier !== identifier) {
        return;
      }
      setIsFetching(true);
    });

    const cleanupGetResolved = novu.on('subscription.get.resolved', ({ args, data, error }) => {
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
  }, [topicKey, identifier, novu, fetchSubscription, onError, onSuccess]);

  const refetch = useCallback(() => fetchSubscription({ refetch: true }), [fetchSubscription]);

  const create = useCallback(async () => {
    const response = await novu.subscriptions.create({ ...optionsRef.current });

    if (response.data) {
      setSubscription(response.data);
    } else if (response.error) {
      setError(response.error);
    }

    return response;
  }, [novu]);

  const remove = useCallback(async () => {
    if (!subscriptionRef.current?.id) {
      return Promise.resolve({
        data: undefined,
        error: new NovuError('Subscription not found', 'SUBSCRIPTION_NOT_FOUND'),
      });
    }

    const response = await novu.subscriptions.delete({ subscriptionId: subscriptionRef.current.id });

    if (response.data) {
      setSubscription(null);
    } else if (response.error) {
      setError(response.error);
    }

    return response;
  }, [novu]);

  return {
    subscription,
    error,
    isLoading,
    isFetching,
    refetch,
    create,
    remove,
  };
};
