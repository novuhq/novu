export type OrganizationId = string;

export enum ApiServiceLevelEnum {
  FREE = 'free',
  PRO = 'pro',
  /** @deprecated Use TEAM instead */
  BUSINESS = 'business',
  TEAM = 'team',
  ENTERPRISE = 'enterprise',
  /**
   * @deprecated Use ENTERPRISE instead
   * TODO: NV-3067 - Remove unlimited tier once all organizations have a service level
   *
   */
  UNLIMITED = 'unlimited', // Redirect to enterprise
}

export function migrateServiceLevel(level: ApiServiceLevelEnum): ApiServiceLevelEnum {
  switch (level) {
    case ApiServiceLevelEnum.UNLIMITED:
      return ApiServiceLevelEnum.ENTERPRISE;
    case ApiServiceLevelEnum.BUSINESS:
      return ApiServiceLevelEnum.TEAM;

    default:
      return level;
  }
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
