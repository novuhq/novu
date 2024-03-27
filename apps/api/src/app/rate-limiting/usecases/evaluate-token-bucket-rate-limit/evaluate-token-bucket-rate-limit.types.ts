import { Ratelimit } from '@upstash/ratelimit';

export type UpstashRedisClient = ConstructorParameters<typeof Ratelimit>[0]['redis'];

export type EvaluateTokenBucketRateLimitResponseDto = {
  /**
   * Whether the request may pass(true) or exceeded the limit(false)
   */
  success: boolean;
  /**
   * Maximum number of requests allowed within a window.
   */
  limit: number;
  /**
   * How many requests the client has left within the current window.
   */
  remaining: number;
  /**
   * Unix timestamp in milliseconds when the limits are reset.
   */
  reset: number;
};

export type RegionLimiter = ReturnType<typeof Ratelimit.tokenBucket>;

/**
 * You have a bucket filled with `{maxTokens}` tokens that refills constantly
 * at `{refillRate}` per `{interval}`.
 * Every request will remove `{cost}` token(s) from the bucket and if there is no
 * token to take, the request is rejected.
 *
 * **Pro:**
 *
 * - Bursts of requests are smoothed out and you can process them at a constant
 * rate.
 * - Allows to set a higher initial burst limit by setting `maxTokens` higher
 * than `refillRate`
 */
export type CostLimiter = (
  /**
   * How many tokens are refilled per `interval`
   *
   * An interval of `10s` and refillRate of 5 will cause a new token to be added every 2 seconds.
   */
  refillRate: number,
  /**
   * The interval in seconds for the `refillRate`
   */
  interval: number,
  /**
   * Maximum number of tokens.
   * A newly created bucket starts with this many tokens.
   * Useful to allow higher burst limits.
   */
  maxTokens: number,
  /**
   * The number of tokens used in the request.
   */
  cost: number
) => RegionLimiter;
