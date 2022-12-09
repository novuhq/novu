import { EnvironmentId, OrganizationId, SubscriberId, TopicId, UserId } from './types';

export class TopicSubscribersEntity {
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  _userId: UserId;
  _topicId: TopicId;
  subscribers: SubscriberId[];
}
