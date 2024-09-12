import { ApiRateLimitConfigEnum, ApiRateLimitEnvVarNamespace } from './config.types';

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
