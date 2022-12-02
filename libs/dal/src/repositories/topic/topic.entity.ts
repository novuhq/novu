import { EnvironmentId, OrganizationId, TopicId, TopicKey, UserId } from './types';

export class TopicEntity {
  _id: TopicId;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  _userId: UserId;
  key: TopicKey;
  name: string;
  // For users to have related anything they want with the topic.
  customData?: Record<string, unknown>;
}
