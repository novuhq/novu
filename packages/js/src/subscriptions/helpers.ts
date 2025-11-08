import type { InboxService } from '../api';
import type { SubscriptionsCache } from '../cache/subscriptions-cache';
import type { NovuEventEmitter } from '../event-emitter';
import type { Result, SubscriptionPreferenceResponse } from '../types';
import { NovuError } from '../utils/errors';
import { Subscription } from './subscription';
import type {
  CreateSubscriptionArgs,
  DeleteSubscriptionArgs,
  GetSubscriptionArgs,
  ListSubscriptionsArgs,
  PreferenceFilter,
  UpdateSubscriptionArgs,
} from './types';

export const getPreferenceByFilter = (filter: PreferenceFilter, preferences: Array<SubscriptionPreferenceResponse>) => {
  if (typeof filter === 'string') {
    return preferences.find((pref) => pref.workflow.id === filter || pref.workflow.identifier === filter);
  } else if ('workflowId' in filter) {
    return preferences.find(
      (pref) => pref.workflow.id === filter.workflowId || pref.workflow.identifier === filter.workflowId
    );
  }

  const tags = filter.filter.tags ?? [];
  const workflowIds = filter.filter.workflowIds ?? [];
  const filteredPreferences = preferences.filter((pref) => {
    return (
      workflowIds.includes(pref.workflow.id) ||
      workflowIds.includes(pref.workflow.identifier) ||
      tags.some((tag) => pref.workflow.tags?.includes(tag))
    );
  });
  return filteredPreferences;
};

export const listSubscriptions = async ({
  emitter,
  apiService,
  cache,
  useCache,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  cache: SubscriptionsCache;
  useCache: boolean;
  args: ListSubscriptionsArgs;
}): Result<Subscription[]> => {
  try {
    let data = useCache ? cache.getAll(args) : undefined;
    emitter.emit('subscriptions.list.pending', { args, data });

    if (!data) {
      const response = await apiService.fetchSubscriptions(args.topicKey);
      data = response.map((el) => {
        const filters = el.preferences.map((pref) => pref.workflow.identifier || pref.workflow.id);

        return new Subscription({ ...el, topicKey: args.topicKey, filters }, emitter, apiService);
      });

      if (useCache) {
        cache.set(args, data);
        data = cache.getAll(args);
      }
    }

    emitter.emit('subscriptions.list.resolved', { args, data });

    return { data };
  } catch (error) {
    emitter.emit('subscriptions.list.resolved', { args, error });

    return { error: new NovuError('Failed to fetch subscriptions', error) };
  }
};

export const getSubscription = async ({
  emitter,
  apiService,
  cache,
  useCache,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  cache: SubscriptionsCache;
  useCache: boolean;
  args: GetSubscriptionArgs;
}): Result<Subscription | null> => {
  try {
    let data = useCache ? cache.get(args) : undefined;
    emitter.emit('subscription.get.pending', { args, data });

    if (!data) {
      const response = await apiService.getSubscription(args.topicKey, args.identifier ?? '');
      if (!response) {
        emitter.emit('subscription.get.resolved', { args, data: null });

        return { data: null };
      }

      data = new Subscription({ ...response, topicKey: args.topicKey, filters: args.filters }, emitter, apiService);

      if (useCache) {
        cache.setOne(args, data);
        data = cache.get(args);
      }
    }

    emitter.emit('subscription.get.resolved', { args, data });

    return { data };
  } catch (error) {
    emitter.emit('subscription.get.resolved', { args, error });

    return { error: new NovuError('Failed to fetch subscription', error) };
  }
};

export const createSubscription = async ({
  emitter,
  apiService,
  cache,
  useCache,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  cache: SubscriptionsCache;
  useCache: boolean;
  args: CreateSubscriptionArgs;
}): Result<Subscription> => {
  try {
    emitter.emit('subscription.create.pending', { args });

    const response = await apiService.createSubscription({
      topicKey: args.topicKey,
      identifier: args.identifier ?? '',
      preferences: args.preferences,
    });

    const filters: PreferenceFilter[] = response.preferences.map(
      (pref) => pref.workflow.identifier || pref.workflow.id
    );

    const subscription = new Subscription({ ...response, topicKey: args.topicKey, filters }, emitter, apiService);

    if (useCache) {
      cache.invalidate({ topicKey: args.topicKey });
    }

    emitter.emit('subscription.create.resolved', { args, data: subscription });

    return { data: subscription };
  } catch (error) {
    emitter.emit('subscription.create.resolved', { args, error });

    return { error: new NovuError('Failed to create subscription', error) };
  }
};

export const updateSubscription = async ({
  emitter,
  apiService,
  cache,
  useCache,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  cache: SubscriptionsCache;
  useCache: boolean;
  args: UpdateSubscriptionArgs;
}): Result<Subscription> => {
  const subscriptionId = 'subscriptionId' in args ? args.subscriptionId : args.subscription.id;
  const subscription = 'subscription' in args ? args.subscription : undefined;
  const topicKey = subscription?.topicKey;

  try {
    emitter.emit('subscription.update.pending', {
      args,
      data: subscription,
    });

    const response = await apiService.updateSubscription({
      subscriptionId,
      preferences: args.preferences,
    });

    const filters: PreferenceFilter[] = response.preferences.map(
      (pref) => pref.workflow.identifier || pref.workflow.id
    );

    const updatedSubscription = new Subscription(
      { ...response, topicKey: topicKey || '', filters },
      emitter,
      apiService
    );

    if (useCache && topicKey) {
      cache.invalidate({ topicKey });
    }

    emitter.emit('subscription.update.resolved', { args, data: updatedSubscription });

    return { data: updatedSubscription };
  } catch (error) {
    emitter.emit('subscription.update.resolved', { args, error });

    return { error: new NovuError('Failed to update subscription', error) };
  }
};

export const deleteSubscription = async ({
  emitter,
  apiService,
  cache,
  useCache,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  cache: SubscriptionsCache;
  useCache: boolean;
  args: DeleteSubscriptionArgs;
}): Result<void> => {
  const subscriptionId = 'subscriptionId' in args ? args.subscriptionId : args.subscription.id;
  const topicKey = 'subscription' in args ? args.subscription.topicKey : undefined;

  try {
    emitter.emit('subscription.delete.pending', { args });

    await apiService.deleteSubscription(subscriptionId);

    if (useCache && topicKey) {
      cache.invalidate({ topicKey });
    }

    emitter.emit('subscription.delete.resolved', { args });

    return { data: undefined };
  } catch (error) {
    emitter.emit('subscription.delete.resolved', { args, error });

    return { error: new NovuError('Failed to delete subscription', error) };
  }
};
