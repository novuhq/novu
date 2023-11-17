import { Ratelimit } from '@upstash/ratelimit';

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
 *
 * Adapted from the @upstash/ratelimit library tokenBucket algorithm to include a variable cost:
 * @see https://github.com/upstash/ratelimit/blob/de9d6f3decf4bb5b8dbbe7ae9058b383ab4d0692/src/single.ts#L292
 */
type CostLimiter = (
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
) => ReturnType<typeof Ratelimit.tokenBucket>;

export const createLimiter: CostLimiter = (refillRate, interval, maxTokens, cost) => {
  const script = /* Lua */ `
    local key         = KEYS[1]           -- identifier including prefixes
    local maxTokens   = tonumber(ARGV[1]) -- maximum number of tokens
    local interval    = tonumber(ARGV[2]) -- size of the window in milliseconds
    local refillRate  = tonumber(ARGV[3]) -- how many tokens are refilled after each interval
    local now         = tonumber(ARGV[4]) -- current timestamp in milliseconds
    local cost        = tonumber(ARGV[5]) -- cost of request
    local remaining   = 0

    -- Helper function to compute a non-negative number of remaining tokens
    local function clampTokens(tokens) return math.max(0, tokens) end
    
    local bucket = redis.call("HMGET", key, "updatedAt", "tokens")
    
    if bucket[1] == false then
      -- The bucket does not exist yet, so we create it and add a ttl.
      remaining = clampTokens(maxTokens - cost)
      
      redis.call("HMSET", key, "updatedAt", now, "tokens", remaining)
      redis.call("PEXPIRE", key, interval)

      return {remaining, now + interval}
    end

    -- The bucket does exist

    local updatedAt = tonumber(bucket[1])
    local tokens = tonumber(bucket[2])

    if now >= updatedAt + interval then
      if tokens <= 0 then 
        -- No more tokens were left before the refill.
        remaining = clampTokens(math.min(maxTokens, refillRate) - cost)
      else
        remaining = clampTokens(math.min(maxTokens, tokens + refillRate) - cost)
      end
      redis.call("HMSET", key, "updatedAt", now, "tokens", remaining)
      return {remaining, now + interval}
    end
    
    remaining = clampTokens(tokens - cost)
    redis.call("HSET", key, "tokens", remaining)
    return {remaining, updatedAt + interval}
`;

  const intervalDurationMs = interval * 1e3;

  return async function (ctx, identifier) {
    if (ctx.cache) {
      const { blocked, reset } = ctx.cache.isBlocked(identifier);
      if (blocked) {
        return {
          success: false,
          limit: maxTokens,
          remaining: 0,
          reset: reset,
          pending: Promise.resolve(),
        };
      }
    }

    const now = Date.now();
    const key = [identifier, Math.floor(now / intervalDurationMs)].join(':');

    const [remaining, reset] = (await ctx.redis.eval(
      script,
      [key],
      [maxTokens, intervalDurationMs, refillRate, now, cost]
    )) as [number, number];

    const success = remaining > 0;
    if (ctx.cache && !success) {
      ctx.cache.blockUntil(identifier, reset);
    }

    return {
      success,
      limit: maxTokens,
      remaining,
      reset,
      pending: Promise.resolve(),
    };
  };
};
