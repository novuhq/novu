import {
  ExternalSubscriberId,
  TopicKey,
  TopicName,
  TriggerRecipientsTypeEnum,
} from '@novu/shared';

export interface ITopic {
  type: TriggerRecipientsTypeEnum.TOPIC;
  topicKey: TopicKey;
}

export interface ITopics {
  addSubscribers(topicKey: TopicKey, data: ITopicSubscribersPayload);
  create(data: ITopicPayload);
  get(topicKey: TopicKey);
  getSubscriber(topicKey: TopicKey, externalSubscriberId: ExternalSubscriberId);
  list(data: ITopicPaginationPayload);
  rename(topicKey: TopicKey, newName: TopicName);
  removeSubscribers(topicKey: TopicKey, data: ITopicSubscribersPayload);
}

export interface ITopicPayload {
  key?: TopicKey;
  name?: TopicName;
}

export interface ITopicPaginationPayload {
  page: number;
  pageSize?: number;
}

export interface ITopicSubscribersPayload {
  subscribers: ExternalSubscriberId[];
}
