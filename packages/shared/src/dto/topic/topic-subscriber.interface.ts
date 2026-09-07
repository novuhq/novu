import { EnvironmentId, ExternalSubscriberId, OrganizationId, SubscriberId, TopicId, TopicKey } from '../../types';

export interface ITopicSubscriber {
  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  _subscriberId: SubscriberId;

  _topicId: TopicId;

  topicKey: TopicKey;

  externalSubscriberId: ExternalSubscriberId;
}
