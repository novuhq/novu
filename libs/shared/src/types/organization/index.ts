export type OrganizationId = string;

export enum ApiServiceLevelEnum {
  FREE = 'free',
  BUSINESS = 'business',
  // TODO: NV-3067 - Remove unlimited tier once all organizations have a service level
  UNLIMITED = 'unlimited',
}
