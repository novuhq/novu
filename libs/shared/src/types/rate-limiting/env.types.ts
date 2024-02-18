import { ApiRateLimitServiceMaximumEnvVarFormat } from './service.types';
import { ApiRateLimitAlgorithmEnvVarFormat } from './algorithm.types';
import { ApiRateLimitCostEnvVarFormat } from './cost.types';

/**
 * The format of all environment variables used to configure rate limiting.
 */
export type ApiRateLimitEnvVarFormat =
  | ApiRateLimitCostEnvVarFormat
  | ApiRateLimitAlgorithmEnvVarFormat
  | ApiRateLimitServiceMaximumEnvVarFormat;
