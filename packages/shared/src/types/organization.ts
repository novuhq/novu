export type OrganizationId = string;

export enum ApiServiceLevelEnum {
  FREE = 'free',
  PRO = 'pro',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
  UNLIMITED = 'unlimited',
}

export enum StripeBillingIntervalEnum {
  MONTH = 'month',
  YEAR = 'year',
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
  domain?: string;
  productUseCases?: ProductUseCases;
  language?: string[];
  defaultLocale?: string;
  companySize?: string;
};
