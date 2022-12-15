import { Types } from 'mongoose';

export { EnvironmentId } from '../environment';
export { ExternalSubscriberId, SubscriberId } from '../subscriber';
export { OrganizationId } from '../organization';

export type TopicId = Types.ObjectId;
export type TopicKey = string;
export type TopicName = string;
export type TopicSubscriberId = Types.ObjectId;
