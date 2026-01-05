import type { NotificationTopic } from '@novu/dal';

export type SubscriberTopicPreference = NotificationTopic & {
  _topicSubscriptionId?: string;
  subscriptionIdentifier?: string;
};
