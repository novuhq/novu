export interface TopicPreferenceEvaluation {
  condition?: Record<string, unknown>;
  result: boolean;
  subscriptionIdentifier: string;
}

export interface SubscriberTopicPreference {
  _topicId: string;
  topicKey: string;
  _topicSubscriptionId?: string;
  subscriptionIdentifier?: string;
  preferenceEvaluation?: TopicPreferenceEvaluation;
}
