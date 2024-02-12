/**
 * The namespace for the environment variables used to configure rate limiting.
 */
export type ApiRateLimitEnvVarNamespace = 'API_RATE_LIMIT';

/**
 * The configuration options for rate limiting.
 */
export enum ApiRateLimitConfigEnum {
  ALGORITHM = 'algorithm',
  COST = 'cost',
  MAXIMUM = 'maximum',
}
