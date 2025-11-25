import { InboxService } from '../api';
import { BaseModule } from '../base-module';
import { SubscriptionsCache } from '../cache/subscriptions-cache';
import { NovuEventEmitter } from '../event-emitter';
import { Result } from '../types';
import { createSubscription, deleteSubscription, getSubscription, listSubscriptions } from './helpers';
import { TopicSubscription } from './subscription';
import type {
  BaseDeleteSubscriptionArgs,
  CreateSubscriptionArgs,
  DeleteSubscriptionArgs,
  GetSubscriptionArgs,
  InstanceDeleteSubscriptionArgs,
  ListSubscriptionsArgs,
} from './types';

export class Subscriptions extends BaseModule {
  #useCache: boolean;

  readonly cache: SubscriptionsCache;

  constructor({
    useCache,
    inboxServiceInstance,
    eventEmitterInstance,
  }: {
    useCache: boolean;
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
  }) {
    super({
      eventEmitterInstance,
      inboxServiceInstance,
    });
    this.cache = new SubscriptionsCache({
      emitterInstance: this._emitter,
      inboxServiceInstance: this._inboxService,
      useCache,
    });
    this.#useCache = useCache;
  }

  async list(args: ListSubscriptionsArgs): Result<TopicSubscription[]> {
    return this.callWithSession(() =>
      listSubscriptions({
        emitter: this._emitter,
        apiService: this._inboxService,
        cache: this.cache,
        useCache: this.#useCache,
        args,
      })
    );
  }

  async get(args: GetSubscriptionArgs): Result<TopicSubscription | null> {
    return this.callWithSession(() =>
      getSubscription({
        emitter: this._emitter,
        apiService: this._inboxService,
        cache: this.cache,
        useCache: this.#useCache,
        args,
      })
    );
  }

  async create(args: CreateSubscriptionArgs): Result<TopicSubscription> {
    return this.callWithSession(() =>
      createSubscription({
        emitter: this._emitter,
        apiService: this._inboxService,
        cache: this.cache,
        useCache: this.#useCache,
        args,
      })
    );
  }

  async delete(args: BaseDeleteSubscriptionArgs): Result<void>;
  async delete(args: InstanceDeleteSubscriptionArgs): Result<void>;
  async delete(args: DeleteSubscriptionArgs): Result<void> {
    return this.callWithSession(() =>
      deleteSubscription({
        emitter: this._emitter,
        apiService: this._inboxService,
        args,
      })
    );
  }
}
