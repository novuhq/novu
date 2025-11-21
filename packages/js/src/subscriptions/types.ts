import type { RulesLogic } from 'json-logic-js';
import type { TopicSubscription } from './subscription';
import { SubscriptionPreference } from './subscription-preference';

export type WorkflowIdentifierOrId = string;

export type WorkflowFilter = {
  label?: string;
  workflowId: WorkflowIdentifierOrId;
};

export type WorkflowGroupFilter = {
  label: string;
  filter: { workflowIds?: Array<WorkflowIdentifierOrId>; tags?: string[] };
};

export type WorkflowGroupFilterFunction = {
  label: string;
  filter: (args: {
    preferences: Array<SubscriptionPreference>;
  }) => Array<{ label: string; preference: SubscriptionPreference }>;
};

export type PreferenceFilter =
  | WorkflowIdentifierOrId
  | WorkflowFilter
  | WorkflowGroupFilter
  | WorkflowGroupFilterFunction;

export type SubscriptionWorkflowPreference = {
  workflowId: WorkflowIdentifierOrId;
  value?: boolean | RulesLogic;
};

export type SubscriptionGroupPreference = {
  group: Array<SubscriptionWorkflowPreference>;
};

export type SubscriptionPreferences = SubscriptionWorkflowPreference | SubscriptionGroupPreference;

export type ListSubscriptionsArgs = {
  topicKey: string;
};

export type GetSubscriptionArgs = {
  topicKey: string;
  identifier?: string;
};

export type CreateSubscriptionArgs = {
  topicKey: string;
  identifier?: string;
  filters: Array<WorkflowIdentifierOrId | WorkflowFilter | WorkflowGroupFilter>;
};

export type BaseSubscriptionPreferenceArgs = {
  workflowId: string;
  value: boolean | RulesLogic;
};

export type InstanceSubscriptionPreferenceArgs = {
  preference: SubscriptionPreference;
  value: boolean | RulesLogic;
};

export type UpdateSubscriptionPreferenceArgs = BaseSubscriptionPreferenceArgs | InstanceSubscriptionPreferenceArgs;

export type BaseDeleteSubscriptionArgs = {
  subscriptionId: string;
};

export type InstanceDeleteSubscriptionArgs = {
  subscription: TopicSubscription;
};

export type DeleteSubscriptionArgs = BaseDeleteSubscriptionArgs | InstanceDeleteSubscriptionArgs;
