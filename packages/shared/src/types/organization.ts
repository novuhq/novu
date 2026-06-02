export type OrganizationId = string;

/**
 * HTTP header that the dashboard uses to tag API requests with the originating product
 * (Platform vs Connect). Mirrored onto Clerk publicMetadata + the Mongo organization document
 * during sync. The lowercase variant matches what Node/Express expose on `req.headers`.
 */
export const NOVU_PRODUCT_TYPE_HEADER = 'X-Novu-Product-Type' as const;
export const NOVU_PRODUCT_TYPE_HEADER_LOWERCASE = 'x-novu-product-type' as const;

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

/**
 * Distinguishes the two Novu products that share the same Clerk tenant and dashboard build.
 * Stored on Clerk `publicMetadata.productType` and mirrored on the MongoDB organization document.
 * Treat a missing value as `PLATFORM` so existing tenants keep working without backfill.
 */
export enum OrganizationProductTypeEnum {
  PLATFORM = 'platform',
  CONNECT = 'connect',
}

/**
 * Reads `productType` from a metadata bag without applying a default. Returns the explicit
 * enum value when present and recognized, otherwise `undefined`. Use this when the caller
 * needs to distinguish "missing metadata" (typically a freshly-created org whose backend
 * sync hasn't landed yet) from an explicit Platform/Connect value.
 */
export function tryReadOrganizationProductType(
  metadata?: Record<string, unknown> | { productType?: string | null } | null
): OrganizationProductTypeEnum | undefined {
  const value = metadata && typeof metadata === 'object' ? (metadata as { productType?: unknown }).productType : null;

  if (value === OrganizationProductTypeEnum.CONNECT) {
    return OrganizationProductTypeEnum.CONNECT;
  }

  if (value === OrganizationProductTypeEnum.PLATFORM) {
    return OrganizationProductTypeEnum.PLATFORM;
  }

  return undefined;
}

/**
 * Reads `productType` and applies the `PLATFORM` default for backwards compatibility with
 * existing tenants. Prefer `tryReadOrganizationProductType` in any UX path where defaulting
 * to Platform could trigger a redirect or hide a fresh-but-not-yet-synced org.
 */
export function resolveOrganizationProductType(
  metadata?: Record<string, unknown> | { productType?: string | null } | null
): OrganizationProductTypeEnum {
  return tryReadOrganizationProductType(metadata) ?? OrganizationProductTypeEnum.PLATFORM;
}

export type OrganizationPublicMetadata = {
  externalOrgId?: string;
  domain?: string;
  productUseCases?: ProductUseCases;
  language?: string[];
  defaultLocale?: string;
  companySize?: string;
  industry?: IndustryEnum;
  productType?: OrganizationProductTypeEnum;
};
