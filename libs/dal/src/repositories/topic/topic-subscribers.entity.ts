import { EnvironmentId, OrganizationId, TopicId, UserId } from './types';

import { SubscriberId } from '../subscriber/subscriber.entity';

export class TopicSubscribersEntity {
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  _userId: UserId;
  _topicId: TopicId;
  subscribers: SubscriberId[];
}
