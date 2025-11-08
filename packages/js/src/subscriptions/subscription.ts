import type { InboxService } from '../api';
import type { NovuEventEmitter } from '../event-emitter';
import type { Result, SubscriptionResponse } from '../types';
import { NovuError } from '../utils/errors';
import { getPreferenceByFilter } from './helpers';
import { SubscriptionPreference, SubscriptionPreferenceGroup } from './subscription-preference';
import type { PreferenceFilter, SubscriptionPreferences, WorkflowGroupFilter } from './types';

export class Subscription {
  #emitter: NovuEventEmitter;
  #inboxService: InboxService;
  #isStale: boolean = false;

  readonly id: string;
  readonly identifier: string;
  readonly topicKey: string;
  readonly filters: Array<PreferenceFilter>;
  readonly preferences: Array<SubscriptionPreference | SubscriptionPreferenceGroup>;

  constructor(
    subscription: SubscriptionResponse & { topicKey: string; filters: Array<PreferenceFilter> },
    emitter: NovuEventEmitter,
    inboxService: InboxService
  ) {
    this.#emitter = emitter;
    this.#inboxService = inboxService;

    this.id = subscription.id;
    this.identifier = subscription.identifier;
    this.topicKey = subscription.topicKey;
    this.filters = subscription.filters;

    const preferences: Array<SubscriptionPreference | SubscriptionPreferenceGroup> = [];
    subscription.filters.forEach((filter, index) => {
      const preferencesByFilter = getPreferenceByFilter(filter, subscription.preferences);
      if (preferencesByFilter && !Array.isArray(preferencesByFilter)) {
        preferences.push(
          new SubscriptionPreference(
            {
              enabled: preferencesByFilter.enabled,
              workflow: preferencesByFilter.workflow,
              condition: preferencesByFilter.condition,
            },
            filter,
            index,
            this,
            this.#emitter,
            this.#inboxService
          )
        );
      } else if (preferencesByFilter && Array.isArray(preferencesByFilter)) {
        const groupPreferences = preferencesByFilter.map(
          (pref) =>
            new SubscriptionPreference(
              {
                enabled: pref.enabled,
                workflow: pref.workflow,
                condition: pref.condition,
              },
              filter,
              index,
              this,
              this.#emitter,
              this.#inboxService
            )
        );

        preferences.push(
          new SubscriptionPreferenceGroup(
            groupPreferences,
            filter as WorkflowGroupFilter,
            index,
            this,
            this.#emitter,
            this.#inboxService
          )
        );
      }
    });

    this.preferences = preferences;
  }

  async update(args: { preferences: Array<SubscriptionPreferences> }): Result<Subscription> {
    if (this.#isStale) {
      return {
        error: new NovuError('Cannot update a deleted subscription', new Error('Subscription is stale')),
      };
    }

    try {
      this.#emitter.emit('subscription.update.pending', {
        args: { subscription: this, preferences: args.preferences },
        data: this,
      });

      const response = await this.#inboxService.updateSubscription({
        subscriptionId: this.id,
        preferences: args.preferences,
      });

      const updatedSubscription = new Subscription(
        { ...response, topicKey: this.topicKey, filters: this.filters },
        this.#emitter,
        this.#inboxService
      );
      this.#emitter.emit('subscription.update.resolved', {
        args: { subscription: this, preferences: args.preferences },
        data: updatedSubscription,
      });

      return { data: updatedSubscription };
    } catch (error) {
      this.#emitter.emit('subscription.update.resolved', {
        args: { subscription: this, preferences: args.preferences },
        error,
      });

      return { error: new NovuError('Failed to update subscription', error) };
    }
  }

  async delete(): Result<void> {
    if (this.#isStale) {
      return {
        error: new NovuError('Cannot delete an already deleted subscription', new Error('Subscription is stale')),
      };
    }

    try {
      this.#emitter.emit('subscription.delete.pending', {
        args: { subscription: this },
      });

      await this.#inboxService.deleteSubscription(this.id);

      this.#isStale = true;

      this.#emitter.emit('subscription.delete.resolved', {
        args: { subscription: this },
      });

      return { data: undefined };
    } catch (error) {
      this.#emitter.emit('subscription.delete.resolved', {
        args: { subscription: this },
        error,
      });

      return { error: new NovuError('Failed to delete subscription', error) };
    }
  }
}
