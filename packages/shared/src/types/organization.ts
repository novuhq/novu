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

export enum IndustryEnum {
  ECOMMERCE = 'ecommerce',
  FINTECH = 'fintech',
  SAAS = 'saas',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  MEDIA = 'media',
  MARKETPLACE = 'marketplace',
  GAMING = 'gaming',
  TRAVEL = 'travel',
  REAL_ESTATE = 'real_estate',
  LOGISTICS = 'logistics',
  FOOD_AND_BEVERAGE = 'food_and_beverage',
  INSURANCE = 'insurance',
  GOVERNMENT = 'government',
  NON_PROFIT = 'non_profit',
  TELECOMMUNICATIONS = 'telecommunications',
  RETAIL = 'retail',
  AUTOMOTIVE = 'automotive',
  CONSTRUCTION = 'construction',
  ENERGY = 'energy',
  AGRICULTURE = 'agriculture',
  LEGAL = 'legal',
  OTHER = 'other',
}

export type OrganizationPublicMetadata = {
  externalOrgId?: string;
  domain?: string;
  productUseCases?: ProductUseCases;
  language?: string[];
  defaultLocale?: string;
  companySize?: string;
  industry?: IndustryEnum;
};
