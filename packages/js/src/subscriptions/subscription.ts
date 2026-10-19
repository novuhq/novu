import type { InboxService } from '../api';
import { SubscriptionsCache } from '../cache/subscriptions-cache';
import type { NovuEventEmitter } from '../event-emitter';
import type { Result, SubscriptionResponse } from '../types';
import { NovuError } from '../utils/errors';
import {
  bulkUpdateSubscriptionPreference,
  deleteSubscription,
  updateSubscription,
  updateSubscriptionPreference,
} from './helpers';
import { SubscriptionPreference } from './subscription-preference';
import type {
  BaseSubscriptionPreferenceArgs,
  BaseUpdateSubscriptionArgs,
  InstanceSubscriptionPreferenceArgs,
  InstanceUpdateSubscriptionArgs,
  UpdateSubscriptionArgs,
  UpdateSubscriptionPreferenceArgs,
} from './types';

export class TopicSubscription {
  #emitter: NovuEventEmitter;
  #inboxService: InboxService;
  #cache: SubscriptionsCache;
  #useCache?: boolean;
  #isStale: boolean = false;

  readonly id: string;
  readonly identifier: string;
  readonly topicKey: string;
  readonly preferences?: Array<SubscriptionPreference> | undefined;

  constructor(
    subscription: SubscriptionResponse & { topicKey: string },
    emitter: NovuEventEmitter,
    inboxService: InboxService,
    cache: SubscriptionsCache,
    useCache?: boolean
  ) {
    this.#emitter = emitter;
    this.#inboxService = inboxService;
    this.#cache = cache;
    this.#useCache = useCache;
    this.id = subscription.id;
    this.identifier = subscription.identifier;
    this.topicKey = subscription.topicKey;
    this.preferences = subscription.preferences?.map(
      (pref) => new SubscriptionPreference({ ...pref }, this.#emitter, this.#inboxService, this.#cache, this.#useCache)
    );
  }

  async update(args: BaseUpdateSubscriptionArgs): Result<TopicSubscription>;
  async update(args: InstanceUpdateSubscriptionArgs): Result<TopicSubscription>;
  async update(args: UpdateSubscriptionArgs): Result<TopicSubscription> {
    return updateSubscription({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      cache: this.#cache,
      useCache: this.#useCache,
      args: { ...args, subscription: this },
    });
  }

  async updatePreference(args: BaseSubscriptionPreferenceArgs): Result<SubscriptionPreference>;
  async updatePreference(args: InstanceSubscriptionPreferenceArgs): Result<SubscriptionPreference>;
  async updatePreference(args: UpdateSubscriptionPreferenceArgs): Result<SubscriptionPreference> {
    if (this.#isStale) {
      return {
        error: new NovuError('Cannot update a deleted subscription', new Error('Subscription is stale')),
      };
    }

    return updateSubscriptionPreference({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      cache: this.#cache,
      useCache: this.#useCache,
      args: { ...args, subscriptionId: this.identifier },
    });
  }

  async bulkUpdatePreferences(args: Array<BaseSubscriptionPreferenceArgs>): Result<SubscriptionPreference[]>;
  async bulkUpdatePreferences(args: Array<InstanceSubscriptionPreferenceArgs>): Result<SubscriptionPreference[]>;
  async bulkUpdatePreferences(args: Array<UpdateSubscriptionPreferenceArgs>): Result<SubscriptionPreference[]> {
    if (this.#isStale) {
      return {
        error: new NovuError('Cannot bulk update a deleted subscription', new Error('Subscription is stale')),
      };
    }

    return bulkUpdateSubscriptionPreference({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      cache: this.#cache,
      useCache: this.#useCache,
      args: args.map((arg) => ({ ...arg, subscriptionId: this.identifier })),
    });
  }

  async delete(): Result<void> {
    if (this.#isStale) {
      return {
        error: new NovuError('Cannot delete an already deleted subscription', new Error('Subscription is stale')),
      };
    }

    return deleteSubscription({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      args: { subscription: this },
    });
  }
}
