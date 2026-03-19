import type { InboxService } from '../api';
import type { NovuEventEmitter } from '../event-emitter';
import { TopicSubscription } from '../subscriptions/subscription';
import type { SubscriptionPreference } from '../subscriptions/subscription-preference';
import type { GetSubscriptionArgs, ListSubscriptionsArgs } from '../subscriptions/types';
import { InMemoryCache } from './in-memory-cache';
import type { Cache } from './types';

const getListCacheKey = (args: ListSubscriptionsArgs): string => {
  return `list:${args.topicKey}`;
};

const getTopicKeyFromListCacheKey = (key: string): string => {
  return key.split(':')[1];
};

const getItemCacheKey = (args: { topicKey: string; identifier?: string }): string => {
  return `item:${args.topicKey}:${args.identifier}`;
};

export class SubscriptionsCache {
  #emitter: NovuEventEmitter;
  #cache: Cache<TopicSubscription[]>;
  #useCache: boolean;
  #itemCache: Cache<TopicSubscription>;
  #inboxService: InboxService;

  constructor({
    emitterInstance,
    inboxServiceInstance,
    useCache,
  }: { emitterInstance: NovuEventEmitter; inboxServiceInstance: InboxService; useCache: boolean }) {
    this.#emitter = emitterInstance;
    this.#cache = new InMemoryCache();
    this.#itemCache = new InMemoryCache();
    this.#inboxService = inboxServiceInstance;
    this.#useCache = useCache;

    this.#emitter.on('subscription.create.resolved', ({ data }) => {
      if (data) {
        this.handleCreate(data);
      }
    });

    this.#emitter.on('subscription.update.resolved', ({ data }) => {
      if (data) {
        this.handleUpdate(data);
      }
    });

    this.#emitter.on('subscription.delete.resolved', ({ args }) => {
      if ('subscription' in args) {
        this.handleDelete(args.subscription);
      } else if ('identifier' in args) {
        this.handleDeleteByIdentifier(args.identifier);
      }
    });

    this.#emitter.on('subscription.preference.update.pending', ({ data }) => {
      if (data) {
        this.handlePreferenceUpdate(data);
      }
    });
    this.#emitter.on('subscription.preference.update.resolved', ({ data }) => {
      if (data) {
        this.handlePreferenceUpdate(data);
      }
    });

    this.#emitter.on('subscription.preferences.bulk_update.resolved', ({ data }) => {
      if (data && data.length > 0) {
        this.handleBulkPreferenceUpdate(data);
      }
    });
  }

  private handleCreate = (subscription: TopicSubscription): void => {
    const listKey = getListCacheKey({ topicKey: subscription.topicKey });
    const subscriptions = this.#cache.get(listKey);

    if (subscriptions) {
      const updatedSubscriptions = [...subscriptions, subscription];
      this.#cache.set(listKey, updatedSubscriptions);

      this.#emitter.emit('subscriptions.list.updated', {
        data: { topicKey: subscription.topicKey, subscriptions: updatedSubscriptions },
      });
    }

    this.#itemCache.set(
      getItemCacheKey({ topicKey: subscription.topicKey, identifier: subscription.identifier }),
      subscription
    );
  };

  private handleUpdate = (subscription: TopicSubscription): void => {
    const listKey = getListCacheKey({ topicKey: subscription.topicKey });
    const subscriptions = this.#cache.get(listKey);

    if (subscriptions) {
      const updatedSubscriptions = subscriptions.map((el) => (el.id === subscription.id ? subscription : el));
      this.#cache.set(listKey, updatedSubscriptions);

      this.#emitter.emit('subscriptions.list.updated', {
        data: { topicKey: subscription.topicKey, subscriptions: updatedSubscriptions },
      });
    }

    this.#itemCache.set(
      getItemCacheKey({ topicKey: subscription.topicKey, identifier: subscription.identifier }),
      subscription
    );
  };

  private handlePreferenceUpdate = (preference: SubscriptionPreference): void => {
    this.updateSubscriptionPreferences([preference]);
  };

  private handleBulkPreferenceUpdate = (preferences: SubscriptionPreference[]): void => {
    this.updateSubscriptionPreferences(preferences);
  };

  private updateSubscriptionPreferences = (updatedPreferences: SubscriptionPreference[]): void => {
    const preferencesBySubscription = new Map<string, SubscriptionPreference[]>();
    for (const pref of updatedPreferences) {
      const existing = preferencesBySubscription.get(pref.subscriptionId) ?? [];
      existing.push(pref);
      preferencesBySubscription.set(pref.subscriptionId, existing);
    }

    const allListKeys = this.#cache.keys();
    for (const listKey of allListKeys) {
      const subscriptions = this.#cache.get(listKey);
      if (!subscriptions) continue;

      let hasUpdates = false;
      const updatedSubscriptions = subscriptions.map((subscription) => {
        const subscriptionPreferences = preferencesBySubscription.get(subscription.identifier);
        if (subscriptionPreferences) {
          hasUpdates = true;

          return this.createUpdatedSubscription(subscription, subscriptionPreferences);
        }

        return subscription;
      });

      if (hasUpdates) {
        this.#cache.set(listKey, updatedSubscriptions);

        this.#emitter.emit('subscriptions.list.updated', {
          data: { topicKey: getTopicKeyFromListCacheKey(listKey), subscriptions: updatedSubscriptions },
        });
      }
    }

    const allItemKeys = this.#itemCache.keys();
    for (const key of allItemKeys) {
      const subscription = this.#itemCache.get(key);
      if (!subscription) continue;

      const subscriptionPreferences = preferencesBySubscription.get(subscription.identifier);
      if (subscriptionPreferences) {
        const updatedSubscription = this.createUpdatedSubscription(subscription, subscriptionPreferences);
        this.#itemCache.set(key, updatedSubscription);

        this.#emitter.emit('subscription.update.resolved', {
          args: { subscription: subscription },
          data: updatedSubscription,
        });
      }
    }
  };

  private createUpdatedSubscription = (
    subscription: TopicSubscription,
    subscriptionPreferences: SubscriptionPreference[]
  ): TopicSubscription => {
    const updatedPreferences = subscription.preferences?.map((pref) => {
      const newPreference = subscriptionPreferences.find((el) => el.workflow.id === pref.workflow.id);
      if (newPreference) {
        return newPreference;
      }

      return pref;
    });

    return new TopicSubscription(
      {
        id: subscription.id,
        identifier: subscription.identifier,
        topicKey: subscription.topicKey,
        preferences: updatedPreferences,
      },
      this.#emitter,
      this.#inboxService,
      this,
      this.#useCache
    );
  };

  private handleDelete = (subscription: TopicSubscription): void => {
    const listKey = getListCacheKey({ topicKey: subscription.topicKey });
    const subscriptions = this.#cache.get(listKey);

    if (subscriptions) {
      const updatedSubscriptions = subscriptions.filter((el) => el.id !== subscription.id);
      this.#cache.set(listKey, updatedSubscriptions);

      this.#emitter.emit('subscriptions.list.updated', {
        data: { topicKey: subscription.topicKey, subscriptions: updatedSubscriptions },
      });
    }

    this.#itemCache.remove(getItemCacheKey({ topicKey: subscription.topicKey, identifier: subscription.identifier }));
  };

  private handleDeleteByIdentifier = (identifier: string): void => {
    const allListKeys = this.#cache.keys();

    for (const listKey of allListKeys) {
      const subscriptions = this.#cache.get(listKey);
      if (subscriptions) {
        const subscription = subscriptions.find((el) => el.identifier === identifier);
        if (subscription) {
          const updatedSubscriptions = subscriptions.filter((el) => el.identifier !== identifier);
          this.#cache.set(listKey, updatedSubscriptions);

          this.#emitter.emit('subscriptions.list.updated', {
            data: { topicKey: getTopicKeyFromListCacheKey(listKey), subscriptions: updatedSubscriptions },
          });

          this.#itemCache.remove(
            getItemCacheKey({ topicKey: subscription.topicKey, identifier: subscription.identifier })
          );

          return;
        }
      }
    }

    const allItemKeys = this.#itemCache.keys();
    for (const key of allItemKeys) {
      const subscription = this.#itemCache.get(key);
      if (subscription && subscription.identifier === identifier) {
        this.#itemCache.remove(key);

        return;
      }
    }
  };

  has(args: ListSubscriptionsArgs): boolean {
    return this.#cache.get(getListCacheKey(args)) !== undefined;
  }

  set(args: ListSubscriptionsArgs, data: TopicSubscription[]): void {
    this.#cache.set(getListCacheKey(args), data);

    for (const subscription of data) {
      this.#itemCache.set(
        getItemCacheKey({ topicKey: args.topicKey, identifier: subscription.identifier }),
        subscription
      );
    }
  }

  setOne(args: GetSubscriptionArgs, data: TopicSubscription): void {
    this.#itemCache.set(getItemCacheKey(args), data);
  }

  getAll(args: ListSubscriptionsArgs): TopicSubscription[] | undefined {
    return this.#cache.get(getListCacheKey(args));
  }

  get(args: GetSubscriptionArgs): TopicSubscription | undefined {
    return this.#itemCache.get(getItemCacheKey(args));
  }

  invalidate(args: { topicKey: string }): void {
    const listKey = getListCacheKey({ topicKey: args.topicKey });
    const subscriptions = this.#cache.get(listKey);

    if (subscriptions) {
      for (const subscription of subscriptions) {
        this.#itemCache.remove(getItemCacheKey({ topicKey: args.topicKey, identifier: subscription.identifier }));
      }
    }

    this.#cache.remove(listKey);

    const allItemKeys = this.#itemCache.keys();

    for (const key of allItemKeys) {
      if (key.startsWith(`item:${args.topicKey}:`)) {
        this.#itemCache.remove(key);
      }
    }
  }

  clearAll(): void {
    this.#cache.clear();
    this.#itemCache.clear();
  }
}
