import { Types } from 'mongoose';

export type EnvironmentId = Types.ObjectId;
export type OrganizationId = Types.ObjectId;
export type TopicId = Types.ObjectId;
type TopicKey = string;
export type UserId = Types.ObjectId;

export class TopicEntity {
  _id: TopicId;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  _userId: UserId;
  key: TopicKey;
  name: string;
  // For users to have related anything they want with the topic.
  customData: Record<string, unknown>;
}
