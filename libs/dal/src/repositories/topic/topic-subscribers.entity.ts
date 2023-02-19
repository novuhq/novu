import {
  EnvironmentId,
  ExternalSubscriberId,
  OrganizationId,
  SubscriberId,
  TopicId,
  TopicKey,
  TopicSubscriberId,
} from './types';

export class TopicSubscribersEntity {
  _id: TopicSubscriberId;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  _subscriberId: SubscriberId;
  _topicId: TopicId;
  topicKey: TopicKey;
  externalSubscriberId: ExternalSubscriberId;
}

export type CreateTopicSubscribersEntity = Omit<TopicSubscribersEntity, '_id'>;
