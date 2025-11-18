import { createEffect, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import {
  CreateSubscriptionArgs,
  DeleteSubscriptionArgs,
  GetSubscriptionArgs,
  TopicSubscription,
} from '../../../subscriptions';
import { useNovu } from '../../context';

export const useSubscription = (options: GetSubscriptionArgs) => {
  const novuAccessor = useNovu();

  const [loading, setLoading] = createSignal(true);
  const [subscription, { mutate, refetch }] = createResource(options || {}, async ({ topicKey, identifier }) => {
    try {
      const response = await novuAccessor().subscriptions.get({ topicKey, identifier });

      return response.data;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      throw error;
    }
  });

  const create = async (args: CreateSubscriptionArgs) => {
    try {
      setLoading(true);
      const response = await novuAccessor().subscriptions.create(args);

      if (response.data) {
        mutate(response.data);
      }

      return response;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (args: DeleteSubscriptionArgs) => {
    try {
      setLoading(true);
      const response =
        'subscription' in args
          ? await novuAccessor().subscriptions.delete({ subscription: args.subscription })
          : await novuAccessor().subscriptions.delete({ subscriptionId: args.subscriptionId });

      mutate(null);

      return response;
    } catch (error) {
      console.error('Error deleting subscription:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    const listener = ({ data }: { data?: TopicSubscription }) => {
      if (!data || data.topicKey !== options.topicKey || data.identifier !== options.identifier) {
        return;
      }

      mutate(data);
    };

    const currentNovu = novuAccessor();
    const cleanupCreate = currentNovu.on('subscription.create.resolved', listener);
    const cleanupUpdate = currentNovu.on('subscription.update.resolved', listener);
    const cleanupDelete = currentNovu.on('subscription.delete.resolved', () => {
      mutate(null);
    });

    onCleanup(() => {
      cleanupCreate();
      cleanupUpdate();
      cleanupDelete();
    });
  });

  createEffect(() => {
    setLoading(subscription.loading);
  });

  return { subscription, loading, mutate, refetch, create, remove };
};
