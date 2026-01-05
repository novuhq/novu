import type { RulesLogic } from 'json-logic-js';
import { InboxService } from '../api';
import { SubscriptionsCache } from '../cache';
import { NovuEventEmitter } from '../event-emitter';
import type { Result, SubscriptionPreferenceResponse, Workflow } from '../types';
import { updateSubscriptionPreference } from './helpers';

export class SubscriptionPreference {
  #emitter: NovuEventEmitter;
  #inboxService: InboxService;
  #cache: SubscriptionsCache;
  #useCache?: boolean;

  readonly subscriptionId: string;
  readonly workflow: Workflow;
  readonly enabled: boolean;
  readonly condition?: RulesLogic;

  constructor(
    preference: SubscriptionPreferenceResponse,
    emitter: NovuEventEmitter,
    inboxService: InboxService,
    cache: SubscriptionsCache,
    useCache?: boolean
  ) {
    this.#emitter = emitter;
    this.#inboxService = inboxService;
    this.#cache = cache;
    this.#useCache = useCache;
    this.enabled = preference.enabled;
    this.condition = preference.condition ?? undefined;
    this.workflow = preference.workflow;
    this.subscriptionId = preference.subscriptionId;
  }

  async update(args: { value: boolean | RulesLogic }): Result<SubscriptionPreference> {
    return updateSubscriptionPreference({
      emitter: this.#emitter,
      apiService: this.#inboxService,
      cache: this.#cache,
      useCache: this.#useCache,
      args: {
        subscriptionId: this.subscriptionId,
        workflowId: this.workflow?.id,
        value: args.value,
        preference: this,
      },
    });
  }
}
