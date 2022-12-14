import { Types } from 'mongoose';

export { EnvironmentId } from '../environment';
export { ExternalSubscriberId } from '../subscriber';
export { OrganizationId } from '../organization';

export type TopicId = Types.ObjectId;
export type TopicKey = string;
export type UserId = Types.ObjectId;
