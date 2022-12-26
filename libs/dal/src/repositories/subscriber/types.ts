import { Types } from 'mongoose';

export type ExternalSubscriberId = string;
export type SubscriberId = Types.ObjectId;

export interface IExternalSubscribersEntity {
  // TODO: Move to EnvironmentId, OrganizationId when possible
  _environmentId: string;
  _organizationId: string;
  externalSubscriberIds: ExternalSubscriberId[];
}
