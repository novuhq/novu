import { EvaluateApiRateLimit } from './evaluate-api-rate-limit';
import { GetApiRateLimitMaximum } from './get-api-rate-limit-maximum';
import { GetApiRateLimitAlgorithmConfig } from './get-api-rate-limit-algorithm-config';
import { GetApiRateLimitServiceMaximumConfig } from './get-api-rate-limit-service-maximum-config';
import { GetApiRateLimitCostConfig } from './get-api-rate-limit-cost-config';

export const USE_CASES = [
  //
  GetApiRateLimitServiceMaximumConfig,
  GetApiRateLimitMaximum,
  GetApiRateLimitAlgorithmConfig,
  GetApiRateLimitCostConfig,
  EvaluateApiRateLimit,
];
