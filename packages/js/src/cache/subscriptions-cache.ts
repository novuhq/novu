import type { NovuEventEmitter } from '../event-emitter';
import type { Subscription } from '../subscriptions/subscription';
import type { GetSubscriptionArgs, ListSubscriptionsArgs } from '../subscriptions/types';
import { InMemoryCache } from './in-memory-cache';
import type { Cache } from './types';

const getListCacheKey = (args: ListSubscriptionsArgs): string => {
  return `list:${args.topicKey}`;
};

const getItemCacheKey = (args: { topicKey: string; identifier?: string }): string => {
  return `item:${args.topicKey}:${args.identifier}`;
};

export class SubscriptionsCache {
  #emitter: NovuEventEmitter;
  #cache: Cache<Subscription[]>;
  #itemCache: Cache<Subscription>;

  constructor({ emitterInstance }: { emitterInstance: NovuEventEmitter }) {
    this.#emitter = emitterInstance;
    this.#cache = new InMemoryCache();
    this.#itemCache = new InMemoryCache();

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
      }
    });
  }

  private handleCreate = (subscription: Subscription): void => {
    const listKey = getListCacheKey({ topicKey: subscription.topicKey });
    const subscriptions = this.#cache.get(listKey);

    if (subscriptions) {
      const updatedSubscriptions = [...subscriptions, subscription];
      this.#cache.set(listKey, updatedSubscriptions);

      this.#emitter.emit('subscriptions.list.updated', {
        data: updatedSubscriptions,
      });
    }

    this.#itemCache.set(
      getItemCacheKey({ topicKey: subscription.topicKey, identifier: subscription.identifier }),
      subscription
    );
  };

  private handleUpdate = (subscription: Subscription): void => {
    const listKey = getListCacheKey({ topicKey: subscription.topicKey });
    const subscriptions = this.#cache.get(listKey);

    if (subscriptions) {
      const index = subscriptions.findIndex((el) => el.id === subscription.id);
      if (index !== -1) {
        const updatedSubscriptions = [...subscriptions];
        updatedSubscriptions[index] = subscription;
        this.#cache.set(listKey, updatedSubscriptions);

        this.#emitter.emit('subscriptions.list.updated', {
          data: updatedSubscriptions,
        });
      }
    }

    this.#itemCache.set(
      getItemCacheKey({ topicKey: subscription.topicKey, identifier: subscription.identifier }),
      subscription
    );
  };

  private handleDelete = (subscription: Subscription): void => {
    const listKey = getListCacheKey({ topicKey: subscription.topicKey });
    const subscriptions = this.#cache.get(listKey);

    if (subscriptions) {
      const updatedSubscriptions = subscriptions.filter((el) => el.id !== subscription.id);
      this.#cache.set(listKey, updatedSubscriptions);

      this.#emitter.emit('subscriptions.list.updated', {
        data: updatedSubscriptions,
      });
    }

    this.#itemCache.remove(getItemCacheKey({ topicKey: subscription.topicKey, identifier: subscription.identifier }));
  };

  has(args: ListSubscriptionsArgs): boolean {
    return this.#cache.get(getListCacheKey(args)) !== undefined;
  }

  set(args: ListSubscriptionsArgs, data: Subscription[]): void {
    this.#cache.set(getListCacheKey(args), data);

    for (const subscription of data) {
      this.#itemCache.set(
        getItemCacheKey({ topicKey: args.topicKey, identifier: subscription.identifier }),
        subscription
      );
    }
  }

  setOne(args: GetSubscriptionArgs, data: Subscription): void {
    this.#itemCache.set(getItemCacheKey(args), data);
  }

  getAll(args: ListSubscriptionsArgs): Subscription[] | undefined {
    return this.#cache.get(getListCacheKey(args));
  }

  get(args: GetSubscriptionArgs): Subscription | undefined {
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

  clear(): void {
    this.#cache.clear();
    this.#itemCache.clear();
  }
}
