import { ApiRateLimitCategoryTypeEnum, IApiRateLimits } from '../environment';
import { ApiServiceLevelTypeEnum } from '../organization';

export type IServiceApiRateLimits = Record<ApiServiceLevelTypeEnum, IApiRateLimits>;

type ApiRateLimitNamespace = 'API_RATE_LIMIT';

export type ApiRateLimitEnvVarFormat =
  Uppercase<`${ApiRateLimitNamespace}_${ApiServiceLevelTypeEnum}_${ApiRateLimitCategoryTypeEnum}`>;

export enum ApiRateLimitConfigurationEnum {
  BURST_ALLOWANCE = 'burstAllowance',
  WINDOW_DURATION = 'windowDuration',
}

export class IApiRateLimitConfiguration implements Record<ApiRateLimitConfigurationEnum, unknown> {
  /**
   * A decimal x >= 0 determining the proportion of base requests that are allowed in excess of the rate limit.
   *
   * For example an `x` of 0.1 would allow 10% of the base requests to exceed the rate limit.
   */
  [ApiRateLimitConfigurationEnum.BURST_ALLOWANCE]: number;
  /**
   * A number x >= 1 in seconds at which the rate limit allowance is refilled.
   *
   * For example a `windowDuration` of 1 would refill the rate limit allowance every second.
   */
  [ApiRateLimitConfigurationEnum.WINDOW_DURATION]: number;
}

export type ApiRateLimitConfigurationEnvVarFormat =
  Uppercase<`${ApiRateLimitNamespace}_${ApiRateLimitConfigurationEnum}`>;
