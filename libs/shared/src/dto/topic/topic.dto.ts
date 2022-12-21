import {
  EnvironmentId,
  ExternalSubscriberId,
  OrganizationId,
  SubscriberId,
  TopicId,
  TopicKey,
  TopicName,
  UserId,
} from '../../types';

export class TopicDto {
  _id: TopicId;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;
  key: TopicKey;
  name: TopicName;
  subscribers: ExternalSubscriberId[];
}

export class TopicSubscribersDto {
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;
  _subscriberId: SubscriberId;
  _topicId: TopicId;
  topicKey: TopicKey;
  externalSubscriberId: ExternalSubscriberId;
}
