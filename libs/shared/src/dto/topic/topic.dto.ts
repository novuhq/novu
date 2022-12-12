import { EnvironmentId, OrganizationId, SubscriberId, TopicId, TopicKey, TopicName, UserId } from '../../types';

export class TopicDto {
  _id: TopicId;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;
  _userId: UserId;
  key: TopicKey;
  name: TopicName;
  subscribers?: SubscriberId[];
}
