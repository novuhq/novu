import { ApiServiceLevelEnum } from '../organization';
import { ApiRateLimitConfigEnum, ApiRateLimitEnvVarNamespace } from './config.types';

/**
 * The categories of rate limits.
 */
export enum ApiRateLimitCategoryEnum {
  TRIGGER = 'trigger',
  CONFIGURATION = 'configuration',
  GLOBAL = 'global',
}

/**
 * A map of numbers x >= 1 determining the maximum number of requests allowed per category.
 */
export type IApiRateLimitMaximum = Record<ApiRateLimitCategoryEnum, number>;

/**
 * A map of of the API Service level to the maximum number of requests allowed per category.
 */
export type IApiRateLimitServiceMaximum = Record<ApiServiceLevelEnum, IApiRateLimitMaximum>;

/**
 * The format of the environment variables used to configure maximum number of requests allowed per category.
 */
export type ApiRateLimitServiceMaximumEnvVarFormat =
  Uppercase<`${ApiRateLimitEnvVarNamespace}_${ApiRateLimitConfigEnum.MAXIMUM}_${ApiServiceLevelEnum}_${ApiRateLimitCategoryEnum}`>;
