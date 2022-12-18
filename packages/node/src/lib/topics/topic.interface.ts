import { TopicKey, TriggerRecipientsTypeEnum } from '@novu/shared';

export interface ITopic {
  type: TriggerRecipientsTypeEnum.TOPIC;
  topicKey: TopicKey;
}

export interface ITopics {
  addSubscribers(topicKey: string, data: ITopicSubscribersPayload);
  create(data: ITopicPayload);
  get(topicKey: string);
  list(data: ITopicPaginationPayload);
  rename(topicId: string, newName: string);
  removeSubscribers(topicId: string, data: ITopicSubscribersPayload);
}

export interface ITopicPayload {
  key?: string;
  name?: string;
}

export interface ITopicPaginationPayload {
  page: number;
  pageSize?: number;
}

export interface ITopicSubscribersPayload {
  subscribers: string[];
}
