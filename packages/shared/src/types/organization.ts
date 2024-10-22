export type OrganizationId = string;

export enum ApiServiceLevelEnum {
  FREE = 'free',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
  // TODO: NV-3067 - Remove unlimited tier once all organizations have a service level
  UNLIMITED = 'unlimited',
}

export enum ProductUseCasesEnum {
  IN_APP = 'in_app',
  MULTI_CHANNEL = 'multi_channel',
  DELAY = 'delay',
  TRANSLATION = 'translation',
  DIGEST = 'digest',
}

export type ProductUseCases = Partial<Record<ProductUseCasesEnum, boolean>>;

export type OrganizationPublicMetadata = {
  externalOrgId?: string;
  apiServiceLevel?: ApiServiceLevelEnum;
  domain?: string;
  productUseCases?: ProductUseCases;
  language?: string[];
  defaultLocale?: string;
  companySize?: string;
};
