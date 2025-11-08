import type { RulesLogic } from 'json-logic-js';
import type { Subscription } from './subscription';

export type WorkflowIdentifierOrId = string;

export type WorkflowFilter = {
  workflowId: WorkflowIdentifierOrId;
};

export type WorkflowGroupFilter = {
  filter: { workflowIds?: Array<WorkflowIdentifierOrId>; tags?: string[] };
};

export type PreferenceFilter = WorkflowIdentifierOrId | WorkflowFilter | WorkflowGroupFilter;

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
  filters: Array<PreferenceFilter>;
};

export type CreateSubscriptionArgs = {
  topicKey: string;
  identifier?: string;
  preferences: Array<SubscriptionPreferences>;
};

export type BaseUpdateSubscriptionArgs = {
  subscriptionId: string;
  preferences: Array<SubscriptionPreferences>;
};

export type InstanceUpdateSubscriptionArgs = {
  subscription: Subscription;
  preferences: Array<SubscriptionPreferences>;
};

export type UpdateSubscriptionArgs = BaseUpdateSubscriptionArgs | InstanceUpdateSubscriptionArgs;

export type BaseDeleteSubscriptionArgs = {
  subscriptionId: string;
};

export type InstanceDeleteSubscriptionArgs = {
  subscription: Subscription;
};

export type DeleteSubscriptionArgs = BaseDeleteSubscriptionArgs | InstanceDeleteSubscriptionArgs;
