import type { RulesLogic } from 'json-logic-js';
import type { TopicSubscription } from './subscription';
import { SubscriptionPreference } from './subscription-preference';

export type WorkflowIdentifierOrId = string;

export type WorkflowFilter = {
  workflowId: WorkflowIdentifierOrId;
  enabled?: boolean;
  condition?: RulesLogic;
  filter?: never;
};

export type WorkflowGroupFilter = {
  filter: { workflowIds?: Array<WorkflowIdentifierOrId>; tags?: string[] };
  enabled?: boolean;
  condition?: RulesLogic;
  workflowId?: never;
};

export type PreferenceFilter = WorkflowIdentifierOrId | WorkflowFilter | WorkflowGroupFilter;

export type ListSubscriptionsArgs = {
  topicKey: string;
};

export type GetSubscriptionArgs = {
  topicKey: string;
  identifier?: string;
  workflowIds?: string[];
  tags?: string[];
};

export type CreateSubscriptionArgs = {
  topicKey: string;
  topicName?: string;
  identifier?: string;
  name?: string;
  preferences?: Array<PreferenceFilter> | undefined;
};

export type BaseUpdateSubscriptionArgs = {
  topicKey: string;
  identifier: string;
  name?: string;
  preferences?: Array<PreferenceFilter>;
};

export type InstanceUpdateSubscriptionArgs = {
  subscription: TopicSubscription;
  name?: string;
  preferences?: Array<PreferenceFilter>;
};

export type UpdateSubscriptionArgs = BaseUpdateSubscriptionArgs | InstanceUpdateSubscriptionArgs;

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
  identifier: string;
  topicKey: string;
};

export type InstanceDeleteSubscriptionArgs = {
  subscription: TopicSubscription;
};

export type DeleteSubscriptionArgs = BaseDeleteSubscriptionArgs | InstanceDeleteSubscriptionArgs;
