import { Types } from 'mongoose';

import { EnvironmentId, OrganizationId, TopicId, UserId } from './topic.entity';

import { SubscriberId } from '../subscriber/subscriber.entity';

export class TopicSubscribersEntity {
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  _userId: UserId;
  topicId: TopicId;
  subscribers: [SubscriberId];
}
