import {
  ApiServiceLevelTypeEnum,
  ApiRateLimitCategoryTypeEnum,
  IServiceApiRateLimits,
  IApiRateLimitConfiguration,
} from '../../types';

/**
 * API Rate Limiting defaults applied to production environments.
 * Value units are requests per second.
 */
export const DEFAULT_API_RATE_LIMITS: IServiceApiRateLimits = {
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
};

export const DEFAULT_API_RATE_LIMIT_CONFIGURATION: IApiRateLimitConfiguration = {
  burstAllowance: 0.1,
  windowDuration: 1,
};
