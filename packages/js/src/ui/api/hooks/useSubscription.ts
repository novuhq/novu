import { createEffect, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import {
  CreateSubscriptionArgs,
  DeleteSubscriptionArgs,
  GetSubscriptionArgs,
  TopicSubscription,
} from '../../../subscriptions';
import { useNovu } from '../../context';
import { buildSubscriptionIdentifier } from '../../internal';

export const useSubscription = (options: GetSubscriptionArgs) => {
  const novuAccessor = useNovu();
  const identifier = () => {
    const subscriberId = novuAccessor().subscriberId;
    const contextKey = novuAccessor().contextKey;
    return options.identifier ?? buildSubscriptionIdentifier({ topicKey: options.topicKey, subscriberId, contextKey });
  };

  const [loading, setLoading] = createSignal(true);
  const [subscription, { mutate, refetch }] = createResource(
    options || {},
    async ({ topicKey, identifier, workflowIds, tags }) => {
      try {
        const response = await novuAccessor().subscriptions.get({
          topicKey,
          identifier,
          workflowIds,
          tags,
        });

        return response.data;
      } catch (error) {
        console.error('Error fetching subscription:', error);
        throw error;
      }
    }
  );

  const create = async (args: CreateSubscriptionArgs) => {
    setLoading(true);
    const response = await novuAccessor().subscriptions.create(args);

    if (response.data) {
      mutate(response.data);
    }

    setLoading(false);
    return response;
  };

  const remove = async (args: DeleteSubscriptionArgs) => {
    setLoading(true);
    const response =
      'subscription' in args
        ? await novuAccessor().subscriptions.delete({ subscription: args.subscription })
        : await novuAccessor().subscriptions.delete({ topicKey: args.topicKey, subscriptionId: args.subscriptionId });

    mutate(null);
    setLoading(false);

    return response;
  };

  onMount(() => {
    const listener = ({ data }: { data?: TopicSubscription }) => {
      if (!data || data.topicKey !== options.topicKey || data.identifier !== identifier()) {
        return;
      }

      mutate(data);
      setLoading(false);
    };

    const currentNovu = novuAccessor();
    const cleanupCreatePending = currentNovu.on('subscription.create.pending', ({ args }) => {
      if (!args || args.topicKey !== options.topicKey || args.identifier !== identifier()) {
        return;
      }
      setLoading(true);
    });
    const cleanupCreate = currentNovu.on('subscription.create.resolved', listener);
    const cleanupUpdate = currentNovu.on('subscription.update.resolved', listener);
    const cleanupDeletePending = currentNovu.on('subscription.delete.pending', ({ args }) => {
      const subscriptionId = subscription()?.id;
      const subscriptionIdentifier = subscription()?.identifier;
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
      setLoading(true);
    });
    const cleanupDelete = currentNovu.on('subscription.delete.resolved', ({ args }) => {
      const subscriptionId = subscription()?.id;
      const subscriptionIdentifier = subscription()?.identifier;
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

      mutate(null);
      setLoading(false);
    });

    onCleanup(() => {
      cleanupCreatePending();
      cleanupCreate();
      cleanupDeletePending();
      cleanupUpdate();
      cleanupDelete();
    });
  });

  createEffect(() => {
    setLoading(subscription.loading);
  });

  return { subscription, loading, mutate, refetch, create, remove };
};
