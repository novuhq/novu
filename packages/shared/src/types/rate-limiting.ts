import { ApiServiceLevelEnum } from './organization';

export enum ApiRateLimitAlgorithmEnum {
  BURST_ALLOWANCE = 'burst_allowance',
  WINDOW_DURATION = 'window_duration',
}

/**
 * The configuration options for the rate limit algorithm.
 */
export class IApiRateLimitAlgorithm implements Record<ApiRateLimitAlgorithmEnum, unknown> {
  /**
   * A decimal x >= 0 determining the proportion of base requests that are allowed in excess of the rate limit.
   *
   * For example an `x` of 0.1 would allow 10% of the base requests to exceed the rate limit.
   */
  [ApiRateLimitAlgorithmEnum.BURST_ALLOWANCE]: number;
  /**
   * A number x >= 1 in seconds at which the rate limit allowance is refilled.
   *
   * For example a `windowDuration` of 1 would refill the rate limit allowance every second.
   */
  [ApiRateLimitAlgorithmEnum.WINDOW_DURATION]: number;
}

/**
 * The format of the environment variables used to configure the rate limit algorithm.
 */
export type ApiRateLimitAlgorithmEnvVarFormat =
  Uppercase<`${ApiRateLimitEnvVarNamespace}_${ApiRateLimitConfigEnum.ALGORITHM}_${ApiRateLimitAlgorithmEnum}`>;

/**
 * The namespace for the environment variables used to configure rate limiting.
 */
export type ApiRateLimitEnvVarNamespace = 'API_RATE_LIMIT';

/**
 * The configuration options for rate limiting.
 */
export enum ApiRateLimitConfigEnum {
  ALGORITHM = 'algorithm',
  COST = 'cost',
  MAXIMUM = 'maximum',
}

export enum ApiRateLimitCostEnum {
  SINGLE = 'single',
  BULK = 'bulk',
}

/**
 * A map of numbers x >= 1 determining the cost of a request.
 *
 * For example a `bulk` cost of 100 would count as 100 requests against the rate limit.
 */
export type IApiRateLimitCost = Record<ApiRateLimitCostEnum, number>;

/**
 * The format of all environment variables used to configure rate limiting.
 */
export type ApiRateLimitEnvVarFormat =
  | ApiRateLimitCostEnvVarFormat
  | ApiRateLimitAlgorithmEnvVarFormat
  | ApiRateLimitServiceMaximumEnvVarFormat;

/**
 * The format of the environment variables used to configure the cost of a request.
 */
export type ApiRateLimitCostEnvVarFormat =
  Uppercase<`${ApiRateLimitEnvVarNamespace}_${ApiRateLimitConfigEnum.COST}_${ApiRateLimitCostEnum}`>;

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
