import { ExternalSubscriberId, TopicKey, TopicName } from '@novu/shared';

export interface ITopics {
  addSubscribers(topicKey: TopicKey, data: ITopicSubscribersPayload);
  create(data: ITopicPayload);
  delete(topicKey: TopicKey);
  get(topicKey: TopicKey);
  /**
   * deprecated use checkSubscriber instead
   */
  getSubscriber(topicKey: TopicKey, externalSubscriberId: ExternalSubscriberId);
  checkSubscriber(
    topicKey: TopicKey,
    externalSubscriberId: ExternalSubscriberId
  );
  list(data: ITopicPaginationPayload);
  rename(topicKey: TopicKey, newName: TopicName);
  removeSubscribers(topicKey: TopicKey, data: ITopicSubscribersPayload);
}

export interface ITopicPayload {
  key: TopicKey;
  name: TopicName;
}

export interface ITopicPaginationPayload {
  page?: number;
  pageSize?: number;
  key?: TopicKey;
}

export interface ITopicSubscribersPayload {
  subscribers: ExternalSubscriberId[];
}
