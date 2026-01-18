import { InboxService } from '../api';
import { BaseModule } from '../base-module';
import { SubscriptionsCache } from '../cache/subscriptions-cache';
import { NovuEventEmitter } from '../event-emitter';
import { Options, Result, Subscriber } from '../types';
import { buildSubscriptionIdentifier } from '../ui/internal';
import {
  createSubscription,
  deleteSubscription,
  getSubscription,
  listSubscriptions,
  updateSubscription,
} from './helpers';
import { TopicSubscription } from './subscription';
import type {
  BaseDeleteSubscriptionArgs,
  BaseUpdateSubscriptionArgs,
  CreateSubscriptionArgs,
  DeleteSubscriptionArgs,
  GetSubscriptionArgs,
  InstanceDeleteSubscriptionArgs,
  InstanceUpdateSubscriptionArgs,
  ListSubscriptionsArgs,
  UpdateSubscriptionArgs,
} from './types';

export class Subscriptions extends BaseModule {
  #useCache: boolean;
  #subscriber: Subscriber;
  #contextKey: string;
  readonly cache: SubscriptionsCache;

  constructor({
    useCache,
    inboxServiceInstance,
    eventEmitterInstance,
    subscriber,
    contextKey,
  }: {
    useCache: boolean;
    inboxServiceInstance: InboxService;
    eventEmitterInstance: NovuEventEmitter;
    subscriber: Subscriber;
    contextKey: string;
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
    this.#subscriber = subscriber;
    this.#contextKey = contextKey;
  }

  async list(args: ListSubscriptionsArgs, options?: Options): Result<TopicSubscription[]> {
    return this.callWithSession(() =>
      listSubscriptions({
        emitter: this._emitter,
        apiService: this._inboxService,
        cache: this.cache,
        options: {
          ...options,
          useCache: options?.useCache ?? this.#useCache,
        },
        args,
      })
    );
  }

  async get(args: GetSubscriptionArgs, options?: Options): Result<TopicSubscription | null> {
    return this.callWithSession(() =>
      getSubscription({
        emitter: this._emitter,
        apiService: this._inboxService,
        cache: this.cache,
        options: {
          ...options,
          useCache: options?.useCache ?? this.#useCache,
        },
        args: {
          ...args,
          identifier:
            args.identifier ??
            buildSubscriptionIdentifier({
              topicKey: args.topicKey,
              subscriberId: this.#subscriber.subscriberId,
              contextKey: this.#contextKey,
            }),
        },
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

  async update(args: BaseUpdateSubscriptionArgs): Result<TopicSubscription>;
  async update(args: InstanceUpdateSubscriptionArgs): Result<TopicSubscription>;
  async update(args: UpdateSubscriptionArgs): Result<TopicSubscription> {
    return this.callWithSession(() =>
      updateSubscription({
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
