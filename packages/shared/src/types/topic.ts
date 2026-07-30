import type { CustomDataType } from './utils';

export type TopicId = string;
export type TopicKey = string;
export type TopicName = string;
export type TopicCustomData = CustomDataType;

export type TopicPayload = {
  key: TopicKey;
  name?: TopicName;
  data?: TopicCustomData;
};
