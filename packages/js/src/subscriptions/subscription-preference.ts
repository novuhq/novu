import { RulesLogic } from 'json-logic-js';
import type { Result, SubscriptionPreferenceResponse, Workflow } from '../types';
import type { Subscription } from './subscription';
import { PreferenceFilter, SubscriptionPreferences, WorkflowGroupFilter } from './types';

export class SubscriptionPreference {
  subscription: Subscription;
  #value: boolean | RulesLogic;

  readonly filter: PreferenceFilter;
  readonly workflow: Workflow;

  get value(): boolean | RulesLogic {
    return this.#value;
  }

  constructor(
    preference: SubscriptionPreferenceResponse,
    filter: PreferenceFilter,
    _index: number,
    subscription: Subscription,
    _emitter: unknown,
    _inboxService: unknown
  ) {
    this.subscription = subscription;
    this.filter = filter;

    this.#value = preference.condition ?? preference.enabled;
    this.workflow = preference.workflow;
  }

  toPreference(): SubscriptionPreferences {
    return {
      workflowId: this.workflow.identifier || this.workflow.id,
      value: this.#value,
    };
  }

  async update(args: { value: boolean | RulesLogic }): Result<Subscription> {
    this.#value = args.value;

    const allPreferences = this.subscription.preferences.map((pref) => {
      if (pref instanceof SubscriptionPreferenceGroup) {
        return pref.toPreference();
      }

      return pref.toPreference();
    });

    return this.subscription.update({ preferences: allPreferences });
  }
}

export class SubscriptionPreferenceGroup {
  subscription: Subscription;

  readonly group: Array<SubscriptionPreference>;
  readonly filter: WorkflowGroupFilter;

  constructor(
    group: Array<SubscriptionPreference>,
    filter: WorkflowGroupFilter,
    _index: number,
    subscription: Subscription,
    _emitter: unknown,
    _inboxService: unknown
  ) {
    this.subscription = subscription;
    this.filter = filter;
    this.group = group;
  }

  toPreference(): SubscriptionPreferences {
    return {
      group: this.group.map((pref) => ({
        workflowId: pref.workflow.identifier || pref.workflow.id,
        value: pref.value,
      })),
    };
  }

  async update(args: { group: Array<{ workflowId: string; value: boolean | RulesLogic }> }): Result<Subscription> {
    const updates = new Map(args.group.map((item) => [item.workflowId, item.value]));

    const allPreferences = this.subscription.preferences.map((pref) => {
      if (pref instanceof SubscriptionPreferenceGroup && pref === this) {
        return {
          group: this.group.map((p) => {
            const workflowId = p.workflow.identifier || p.workflow.id;
            const updatedValue = updates.get(workflowId);

            return {
              workflowId,
              value: updatedValue !== undefined ? updatedValue : p.value,
            };
          }),
        };
      }

      return pref.toPreference();
    });

    return this.subscription.update({ preferences: allPreferences });
  }
}
