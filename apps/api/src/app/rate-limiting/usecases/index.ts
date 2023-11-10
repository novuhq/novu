import { EvaluateApiRateLimit } from './evaluate-api-rate-limit';
import { GetApiRateLimit } from './get-api-rate-limit';
import { GetApiRateLimitConfiguration } from './get-api-rate-limit-configuration';
import { GetDefaultApiRateLimits } from './get-default-api-rate-limits';

export const USE_CASES = [
  //
  GetDefaultApiRateLimits,
  GetApiRateLimit,
  GetApiRateLimitConfiguration,
  EvaluateApiRateLimit,
];
