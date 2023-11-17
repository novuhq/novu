import { ApiServiceLevelEnum, ApiRateLimitCategoryEnum, IApiRateLimitServiceMaximum } from '../../types';

/**
 * API Rate Limiting defaults applied to production environments.
 * Value units are requests per second.
 */
export const DEFAULT_API_RATE_LIMIT_SERVICE_MAXIMUM_CONFIG: IApiRateLimitServiceMaximum = {
  [ApiServiceLevelEnum.FREE]: {
    [ApiRateLimitCategoryEnum.TRIGGER]: 60,
    [ApiRateLimitCategoryEnum.CONFIGURATION]: 15,
    [ApiRateLimitCategoryEnum.GLOBAL]: 30,
  },
  [ApiServiceLevelEnum.BUSINESS]: {
    [ApiRateLimitCategoryEnum.TRIGGER]: 600,
    [ApiRateLimitCategoryEnum.CONFIGURATION]: 150,
    [ApiRateLimitCategoryEnum.GLOBAL]: 300,
  },
  [ApiServiceLevelEnum.UNLIMITED]: {
    [ApiRateLimitCategoryEnum.TRIGGER]: 6000,
    [ApiRateLimitCategoryEnum.CONFIGURATION]: 1500,
    [ApiRateLimitCategoryEnum.GLOBAL]: 3000,
  },
};
