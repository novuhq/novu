import { EvaluateApiRateLimit } from './evaluate-api-rate-limit';
import { EvaluateTokenBucketRateLimit } from './evaluate-token-bucket-rate-limit';
import { GetApiRateLimitAlgorithmConfig } from './get-api-rate-limit-algorithm-config';
import { GetApiRateLimitCostConfig } from './get-api-rate-limit-cost-config';
import { GetApiRateLimitMaximum } from './get-api-rate-limit-maximum';

export const USE_CASES = [
  //
  GetApiRateLimitMaximum,
  GetApiRateLimitAlgorithmConfig,
  GetApiRateLimitCostConfig,
  EvaluateApiRateLimit,
  EvaluateTokenBucketRateLimit,
];
