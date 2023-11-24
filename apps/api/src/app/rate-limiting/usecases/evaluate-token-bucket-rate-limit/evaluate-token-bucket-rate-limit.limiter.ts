import { CostLimiter } from './evaluate-token-bucket-rate-limit.types';

export const tokenBucketLimiter: CostLimiter = (refillRate, interval, maxTokens, cost) => {
  const script = /* Lua */ `
    redis.call("SET", "LOG:STA", "---------------------------------")
    local key          = KEYS[1]           -- current interval identifier including prefixes
    local maxTokens    = tonumber(ARGV[1]) -- maximum number of tokens
    local interval     = tonumber(ARGV[2]) -- size of the window in milliseconds
    local fillInterval = tonumber(ARGV[3]) -- time between refills in milliseconds
    local now          = tonumber(ARGV[4]) -- current timestamp in milliseconds
    local cost         = tonumber(ARGV[5]) -- cost of request
    local remaining    = 0 -- remaining number of tokens
    local reset        = 0 -- timestamp when next request of {cost} token(s) can be accepted
    local resetMult    = 0 -- multiplier for the next reset time
    local lastRefill   = 0 -- timestamp of last refill

    local bucket = redis.call("HMGET", key, "lastRefill", "tokens")

    if bucket[1] == false then
      -- The bucket does not exist yet, so we create it and add a ttl.
      lastRefill = now
      remaining = maxTokens - cost
      resetMult = (remaining < cost) and (cost - remaining) or cost
      redis.call("HMSET", key, "lastRefill", lastRefill, "tokens", remaining)
      redis.call("PEXPIRE", key, interval * 2)
    else
      -- The current bucket does exist
      lastRefill = tonumber(bucket[1])
      local tokens = tonumber(bucket[2])

      if tokens >= cost then
        -- Delay refill until bucket is empty
        remaining = tokens - cost
        resetMult = (remaining < cost) and (cost - remaining) or cost
        redis.call("HMSET", key, "tokens", remaining)
      else
        local elapsed = now - lastRefill
        local tokensToAdd = math.floor(elapsed / fillInterval)
        local newTokens = math.min(maxTokens, tokens + tokensToAdd)
        remaining = newTokens - cost

        if remaining >= 0 then
          -- Update the time of the last refill depending on how many tokens we added
          lastRefill = lastRefill + tokensToAdd * fillInterval
          resetMult = (remaining < cost) and (cost - remaining) or cost
          redis.call("HMSET", key, "lastRefill", lastRefill, "tokens", remaining)
          redis.call("PEXPIRE", key, interval * 2)
        else
          resetMult = cost - tokens
        end
      end
    end
    
    reset = lastRefill + resetMult * fillInterval
    redis.call("SET", "LOG:END", "---------------------------------")
    return {remaining, reset}
`;

  const intervalDurationMs = interval * 1e3;
  const fillInterval = intervalDurationMs / refillRate;

  return async function (ctx, identifier) {
    // Cost needs to be included in local cache identifier to ensure lower cost requests are not blocked
    const localCacheIdentifier = `${identifier}:${cost}`;

    if (ctx.cache) {
      const { blocked, reset } = ctx.cache.isBlocked(localCacheIdentifier);
      if (blocked) {
        return {
          success: false,
          limit: refillRate,
          remaining: 0,
          reset: reset,
          pending: Promise.resolve(),
        };
      }
    }

    const now = Date.now();

    const [remaining, reset] = (await ctx.redis.eval(
      script,
      [identifier],
      [maxTokens, intervalDurationMs, fillInterval, now, cost]
    )) as [number, number];

    const success = remaining >= 0;
    const nonNegRemaining = Math.max(0, remaining);
    if (ctx.cache && !success) {
      ctx.cache.blockUntil(localCacheIdentifier, reset);
    }

    return {
      success,
      limit: refillRate,
      remaining: nonNegRemaining,
      reset,
      pending: Promise.resolve(),
    };
  };
};
