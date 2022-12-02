import { SubscriberId } from '../subscriber/subscriber.entity';
import { EnvironmentId, OrganizationId, TopicId, UserId } from './types';

export class TopicSubscribersEntity {
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  _userId: UserId;
  topicId: TopicId;
  subscribers: [SubscriberId];
}
