import { EnvironmentId, ExternalSubscriberId, OrganizationId, SubscriberId, TopicId, TopicSubscriberId } from './types';

export class TopicSubscribersEntity {
  _id?: TopicSubscriberId;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  _subscriberId: SubscriberId;
  _topicId: TopicId;
  externalSubscriberId: ExternalSubscriberId;
}
