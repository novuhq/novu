import { ApiRateLimitCategoryTypeEnum, IApiRateLimits } from '../environment';

export type OrganizationId = string;

export enum ApiServiceLevelTypeEnum {
  FREE = 'free',
  BUSINESS = 'business',
  // TODO: NV-3067 - Remove unlimited tier once all organizations have a service level
  UNLIMITED = 'unlimited',
}

export type IServiceApiRateLimits = Record<ApiServiceLevelTypeEnum, IApiRateLimits>;

export type ApiRateLimitEnvVarFormat =
  Uppercase<`API_RATE_LIMIT_${ApiServiceLevelTypeEnum}_${ApiRateLimitCategoryTypeEnum}`>;
