export type ExternalSubscriberId = string;
export type SubscriberId = string;

export interface IExternalSubscribersEntity {
  // TODO: Move to EnvironmentId, OrganizationId when possible
  _environmentId: string;
  _organizationId: string;
  externalSubscriberIds: ExternalSubscriberId[];
}
