import type { InboxService } from '../api';
import type { SubscriptionsCache } from '../cache/subscriptions-cache';
import type { NovuEventEmitter } from '../event-emitter';
import type { Options, Result } from '../types';
import { NovuError } from '../utils/errors';
import { TopicSubscription } from './subscription';
import { SubscriptionPreference } from './subscription-preference';
import type {
  CreateSubscriptionArgs,
  DeleteSubscriptionArgs,
  GetSubscriptionArgs,
  ListSubscriptionsArgs,
  UpdateSubscriptionArgs,
  UpdateSubscriptionPreferenceArgs,
} from './types';

export const listSubscriptions = async ({
  emitter,
  apiService,
  cache,
  options,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  cache: SubscriptionsCache;
  options: Options;
  args: ListSubscriptionsArgs;
}): Result<TopicSubscription[]> => {
  try {
    const { useCache, refetch } = options;
    let data = useCache && !refetch ? cache.getAll(args) : undefined;
    emitter.emit('subscriptions.list.pending', { args, data });

    if (!data || refetch) {
      const response = await apiService.fetchSubscriptions(args.topicKey);
      data = response.map((el) => {
        return new TopicSubscription({ ...el, topicKey: args.topicKey }, emitter, apiService, cache, useCache);
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
  options,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  cache: SubscriptionsCache;
  options: Options;
  args: GetSubscriptionArgs & { identifier: string };
}): Result<TopicSubscription | null> => {
  try {
    const { useCache, refetch } = options;
    let data = useCache && !refetch ? cache.get(args) : undefined;
    emitter.emit('subscription.get.pending', { args, data });

    if (!data || refetch) {
      const response = await apiService.getSubscription(args.topicKey, args.identifier, args.workflowIds, args.tags);
      if (!response) {
        emitter.emit('subscription.get.resolved', { args, data: null });

        return { data: null };
      }

      data = new TopicSubscription({ ...response, topicKey: args.topicKey }, emitter, apiService, cache, useCache);

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
}): Result<TopicSubscription> => {
  try {
    emitter.emit('subscription.create.pending', { args });

    const response = await apiService.createSubscription({
      identifier: args.identifier ?? '',
      name: args.name,
      topicKey: args.topicKey,
      topicName: args.topicName,
      preferences: args.preferences,
    });

    const subscription = new TopicSubscription(
      { ...response, topicKey: args.topicKey },
      emitter,
      apiService,
      cache,
      useCache
    );

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
  useCache?: boolean;
  args: UpdateSubscriptionArgs;
}): Result<TopicSubscription> => {
  const identifier = 'identifier' in args ? args.identifier : args.subscription.identifier;
  const topicKey = 'topicKey' in args ? args.topicKey : args.subscription.topicKey;

  try {
    emitter.emit('subscription.update.pending', {
      args,
    });

    const response = await apiService.updateSubscription({
      topicKey,
      identifier,
      name: args.name,
      preferences: args.preferences,
    });

    const updatedSubscription = new TopicSubscription({ ...response, topicKey }, emitter, apiService, cache, useCache);

    emitter.emit('subscription.update.resolved', { args, data: updatedSubscription });

    return { data: updatedSubscription };
  } catch (error) {
    emitter.emit('subscription.update.resolved', { args, error });

    return { error: new NovuError('Failed to update subscription', error) };
  }
};

export const updateSubscriptionPreference = async ({
  emitter,
  apiService,
  cache,
  useCache,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  cache: SubscriptionsCache;
  useCache?: boolean;
  args: UpdateSubscriptionPreferenceArgs & { subscriptionId: string };
}): Result<SubscriptionPreference> => {
  const workflowId = 'workflowId' in args ? args.workflowId : args.preference?.workflow?.id;

  try {
    emitter.emit('subscription.preference.update.pending', {
      args,
      data:
        'preference' in args
          ? new SubscriptionPreference(
              {
                ...args.preference,
                ...(typeof args.value === 'boolean' ? { enabled: args.value } : { condition: args.value }),
              },
              emitter,
              apiService,
              cache,
              useCache
            )
          : undefined,
    });

    const response = await apiService.updateSubscriptionPreference({
      subscriptionIdentifier: args.subscriptionId,
      workflowId,
      ...(typeof args.value === 'boolean'
        ? {
            enabled: args.value,
            email: args.value,
            sms: args.value,
            in_app: args.value,
            chat: args.value,
            push: args.value,
          }
        : { condition: args.value }),
    });

    const updatedSubscription = new SubscriptionPreference({ ...response }, emitter, apiService, cache, useCache);

    emitter.emit('subscription.preference.update.resolved', { args, data: updatedSubscription });

    return { data: updatedSubscription };
  } catch (error) {
    emitter.emit('subscription.preference.update.resolved', { args, error });

    return { error: new NovuError('Failed to update subscription', error) };
  }
};

export const bulkUpdateSubscriptionPreference = async ({
  emitter,
  apiService,
  cache,
  useCache,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  cache: SubscriptionsCache;
  useCache?: boolean;
  args: Array<UpdateSubscriptionPreferenceArgs & { subscriptionId: string }>;
}): Result<SubscriptionPreference[]> => {
  try {
    const optimisticallyUpdatedPreferences = args
      .map((arg) =>
        'preference' in arg
          ? new SubscriptionPreference(
              {
                ...arg.preference,
                ...(typeof arg.value === 'boolean' ? { enabled: arg.value } : { condition: arg.value }),
              },
              emitter,
              apiService,
              cache,
              useCache
            )
          : undefined
      )
      .filter((el) => el !== undefined);

    emitter.emit('subscription.preferences.bulk_update.pending', {
      args,
      data: optimisticallyUpdatedPreferences,
    });

    const preferencesToUpdate = args.map((arg) => ({
      subscriptionIdentifier: arg.subscriptionId,
      workflowId:
        'workflowId' in arg
          ? arg.workflowId
          : (arg.preference?.workflow?.id ?? arg.preference?.workflow?.identifier ?? ''),
      ...(typeof arg.value === 'boolean'
        ? { enabled: arg.value, email: arg.value, sms: arg.value, in_app: arg.value, chat: arg.value, push: arg.value }
        : { condition: arg.value }),
    }));
    const response = await apiService.bulkUpdateSubscriptionPreferences(preferencesToUpdate);

    const preferences = response.map((el) => new SubscriptionPreference(el, emitter, apiService, cache, useCache));
    emitter.emit('subscription.preferences.bulk_update.resolved', { args, data: preferences });

    return { data: preferences };
  } catch (error) {
    emitter.emit('subscription.preferences.bulk_update.resolved', { args, error });

    return { error: new NovuError('Failed to bulk update subscription preferences', error) };
  }
};

export const deleteSubscription = async ({
  emitter,
  apiService,
  args,
}: {
  emitter: NovuEventEmitter;
  apiService: InboxService;
  args: DeleteSubscriptionArgs;
}): Result<void> => {
  const identifier = 'identifier' in args ? args.identifier : args.subscription.identifier;
  const topicKey = 'topicKey' in args ? args.topicKey : args.subscription.topicKey;
  try {
    emitter.emit('subscription.delete.pending', { args });

    await apiService.deleteSubscription({ topicKey, identifier });

    emitter.emit('subscription.delete.resolved', { args });

    return { data: undefined };
  } catch (error) {
    emitter.emit('subscription.delete.resolved', { args, error });

    return { error: new NovuError('Failed to delete subscription', error) };
  }
};
