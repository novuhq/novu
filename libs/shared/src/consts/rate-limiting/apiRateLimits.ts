import {
  ApiRateLimitAlgorithmEnum,
  ApiRateLimitCostEnum,
  ApiServiceLevelEnum,
  IApiRateLimitAlgorithm,
  IApiRateLimitCost,
} from '../../types';
import { ApiRateLimitCategoryEnum, IApiRateLimitServiceMaximum } from '../../types/rate-limiting/service.types';

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
  [ApiServiceLevelEnum.ENTERPRISE]: {
    [ApiRateLimitCategoryEnum.TRIGGER]: 6000,
    [ApiRateLimitCategoryEnum.CONFIGURATION]: 1500,
    [ApiRateLimitCategoryEnum.GLOBAL]: 3000,
  },
  [ApiServiceLevelEnum.UNLIMITED]: {
    [ApiRateLimitCategoryEnum.TRIGGER]: 6000,
    [ApiRateLimitCategoryEnum.CONFIGURATION]: 1500,
    [ApiRateLimitCategoryEnum.GLOBAL]: 3000,
  },
};

export const DEFAULT_API_RATE_LIMIT_ALGORITHM_CONFIG: IApiRateLimitAlgorithm = {
  [ApiRateLimitAlgorithmEnum.BURST_ALLOWANCE]: 0.1,
  [ApiRateLimitAlgorithmEnum.WINDOW_DURATION]: 1,
};

export const DEFAULT_API_RATE_LIMIT_COST_CONFIG: IApiRateLimitCost = {
  [ApiRateLimitCostEnum.SINGLE]: 1,
  [ApiRateLimitCostEnum.BULK]: 100,
};
