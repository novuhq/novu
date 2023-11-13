export type OrganizationId = string;

export enum ApiServiceLevelTypeEnum {
  FREE = 'free',
  BUSINESS = 'business',
  // TODO: NV-3067 - Remove unlimited tier once all organizations have a service level
  UNLIMITED = 'unlimited',
}
