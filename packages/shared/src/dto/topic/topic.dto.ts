export class TopicDto {
  _id: string;
  _organizationId: string;
  _environmentId: string;
  key: string;
  name: string;
  subscribers: string[];
}

export class TopicSubscribersDto {
  _organizationId: string;
  _environmentId: string;
  _subscriberId: string;
  _topicId: string;
  topicKey: string;
  externalSubscriberId: string;
}
