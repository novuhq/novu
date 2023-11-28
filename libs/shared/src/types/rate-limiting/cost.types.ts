import { ApiRateLimitConfigEnum, ApiRateLimitEnvVarNamespace } from './config.types';

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
 * The format of the environment variables used to configure the cost of a request.
 */
export type ApiRateLimitCostEnvVarFormat =
  Uppercase<`${ApiRateLimitEnvVarNamespace}_${ApiRateLimitConfigEnum.COST}_${ApiRateLimitCostEnum}`>;
