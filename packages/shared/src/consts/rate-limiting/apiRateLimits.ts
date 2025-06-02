import {
  ApiRateLimitAlgorithmEnum,
  ApiRateLimitCategoryEnum,
  ApiRateLimitCostEnum,
  IApiRateLimitAlgorithm,
  IApiRateLimitCost,
} from '../../types';
import { FeatureNameEnum } from '../feature-tiers-constants';

export const ApiRateLimitCategoryToFeatureName: Record<ApiRateLimitCategoryEnum, FeatureNameEnum> = {
  [ApiRateLimitCategoryEnum.TRIGGER]: FeatureNameEnum.PLATFORM_MAX_API_REQUESTS_TRIGGER_EVENTS,
  [ApiRateLimitCategoryEnum.CONFIGURATION]: FeatureNameEnum.PLATFORM_MAX_API_REQUESTS_CONFIGURATION,
  [ApiRateLimitCategoryEnum.GLOBAL]: FeatureNameEnum.PLATFORM_MAX_API_REQUESTS_GLOBAL,
};
export const DEFAULT_API_RATE_LIMIT_ALGORITHM_CONFIG: IApiRateLimitAlgorithm = {
  [ApiRateLimitAlgorithmEnum.BURST_ALLOWANCE]: 0.1, // allow 10% burst
  [ApiRateLimitAlgorithmEnum.WINDOW_DURATION]: 5, // 5 second window duration
};

export const DEFAULT_API_RATE_LIMIT_COST_CONFIG: IApiRateLimitCost = {
  [ApiRateLimitCostEnum.SINGLE]: 1,
  [ApiRateLimitCostEnum.BULK]: 100,
  [ApiRateLimitCostEnum.KEYLESS]: 1000,
};
