import { EnvironmentId, OrganizationId, SubscriberId, TopicId, TopicKey, UserId } from './types';

export class TopicEntity {
  _id: TopicId;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  _userId: UserId;
  key: TopicKey;
  name: string;
  subscribers?: SubscriberId[];
}
