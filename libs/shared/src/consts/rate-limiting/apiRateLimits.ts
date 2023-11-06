import { ApiServiceLevelTypeEnum, ApiRateLimitCategoryTypeEnum, IPlatformApiRateLimits } from '../../types';

/**
 * A decimal 0 > `x` <= 1 determining the proportion of default rate limit
 * applied as a default for non-production environments.
 *
 * For example an `x` of 0.25 would result in a rate limit for
 * non-production environments of 25% of the default limits.
 */
export const DEFAULT_NON_PRODUCTION_ENVIRONMENT_API_RATE_LIMIT_MULTIPLIER = 1;

/**
 * API Rate Limiting defaults applied to production environments.
 * Value units are requests per second.
 */
export const DEFAULT_API_RATE_LIMITS = {
  [ApiServiceLevelTypeEnum.FREE]: {
    [ApiRateLimitCategoryTypeEnum.TRIGGER]: 60,
    [ApiRateLimitCategoryTypeEnum.CONFIGURATION]: 15,
    [ApiRateLimitCategoryTypeEnum.GLOBAL]: 30,
  },
  [ApiServiceLevelTypeEnum.BUSINESS]: {
    [ApiRateLimitCategoryTypeEnum.TRIGGER]: 600,
    [ApiRateLimitCategoryTypeEnum.CONFIGURATION]: 150,
    [ApiRateLimitCategoryTypeEnum.GLOBAL]: 300,
  },
  [ApiServiceLevelTypeEnum.UNLIMITED]: {
    [ApiRateLimitCategoryTypeEnum.TRIGGER]: 6000,
    [ApiRateLimitCategoryTypeEnum.CONFIGURATION]: 1500,
    [ApiRateLimitCategoryTypeEnum.GLOBAL]: 3000,
  },
} satisfies IPlatformApiRateLimits;
