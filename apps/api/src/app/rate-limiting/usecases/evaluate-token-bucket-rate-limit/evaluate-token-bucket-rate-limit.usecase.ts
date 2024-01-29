import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Ratelimit } from '@upstash/ratelimit';
import { EvaluateTokenBucketRateLimitCommand } from './evaluate-token-bucket-rate-limit.command';
import { CacheService, InstrumentUsecase } from '@novu/application-generic';
import {
  EvaluateTokenBucketRateLimitResponseDto,
  RegionLimiter,
  UpstashRedisClient,
} from './evaluate-token-bucket-rate-limit.types';

const LOG_CONTEXT = 'EvaluateTokenBucketRateLimit';

@Injectable()
export class EvaluateTokenBucketRateLimit {
  private ephemeralCache = new Map<string, number>();
  public algorithm = 'token bucket';

  constructor(private cacheService: CacheService) {}

  @InstrumentUsecase()
  async execute(command: EvaluateTokenBucketRateLimitCommand): Promise<EvaluateTokenBucketRateLimitResponseDto> {
    if (!this.cacheService.cacheEnabled()) {
      const message = 'Rate limiting cache service is not available';
      Logger.error(message, LOG_CONTEXT);
      throw new ServiceUnavailableException(message);
    }

    const cacheClient = EvaluateTokenBucketRateLimit.getCacheClient(this.cacheService);

    const ratelimit = new Ratelimit({
      redis: cacheClient,
      limiter: EvaluateTokenBucketRateLimit.tokenBucketLimiter(
        command.refillRate,
        command.windowDuration,
        command.maxTokens,
        command.cost
      ),
      prefix: '', // Empty cache key prefix to give us full control over the key format
      ephemeralCache: this.ephemeralCache,
    });
    try {
      const { success, limit, remaining, reset } = await ratelimit.limit(command.identifier);

      return {
        success,
        limit,
        remaining,
        reset,
      };
    } catch (error) {
      const apiMessage = 'Failed to evaluate rate limit';
      const logMessage = `${apiMessage} for identifier: "${command.identifier}". Error: "${error}"`;
      Logger.error(logMessage, LOG_CONTEXT);
      throw new ServiceUnavailableException(apiMessage);
    }
  }

  public static getCacheClient(cacheService: CacheService): UpstashRedisClient {
    // Adapter for the @upstash/redis client -> cache client
    return {
      sadd: async (key, ...members) => cacheService.sadd(key, ...members.map((member) => String(member))),
      eval: async (script, keys, args) =>
        cacheService.eval(
          script,
          keys,
          args.map((arg) => String(arg))
        ),
    };
  }

  /**
   * Token Bucket algorithm with variable cost. Adapted from @upstash/ratelimit and modified to support variable cost.
   * Also influenced by Krakend's token bucket implementation to delay refills until bucket is empty.
   *
   * @see https://github.com/upstash/ratelimit/blob/3a8cfb00e827188734ac347965cb743a75fcb98a/src/single.ts#L292
   * @see https://github.com/krakend/krakend-ratelimit/blob/369f0be9b51a4fb8ab7d43e4833d076b461a4374/rate.go#L85
   */
  public static tokenBucketLimiter(
    refillRate: number,
    interval: number,
    maxTokens: number,
    cost: number
  ): RegionLimiter {
    const script = /* Lua */ `
    local key          = KEYS[1]           -- current interval identifier including prefixes
    local maxTokens    = tonumber(ARGV[1]) -- maximum number of tokens
    local interval     = tonumber(ARGV[2]) -- size of the window in milliseconds
    local fillInterval = tonumber(ARGV[3]) -- time between refills in milliseconds
    local now          = tonumber(ARGV[4]) -- current timestamp in milliseconds
    local cost         = tonumber(ARGV[5]) -- cost of request
    local remaining    = 0 -- remaining number of tokens
    local reset        = 0 -- timestamp when next request of {cost} token(s) can be accepted
    local resetCost    = 0 -- multiplier for the next reset time
    local lastRefill   = 0 -- timestamp of last refill

    local bucket = redis.call("HMGET", key, "lastRefill", "tokens")

    if bucket[1] == false then
      -- The bucket does not exist yet, so we create it and add a ttl.
      lastRefill = now
      remaining = maxTokens - cost
      resetCost = (remaining < cost) and (cost - remaining) or cost
      redis.call("HMSET", key, "lastRefill", lastRefill, "tokens", remaining)
      redis.call("PEXPIRE", key, interval * 2)
    else
      -- The current bucket does exist
      lastRefill = tonumber(bucket[1])
      local tokens = tonumber(bucket[2])

      if tokens >= cost then
        -- Delay refill until bucket is empty
        remaining = tokens - cost
        resetCost = (remaining < cost) and (cost - remaining) or cost
        redis.call("HMSET", key, "tokens", remaining)
      else
        local elapsed = now - lastRefill
        local tokensToAdd = math.floor(elapsed / fillInterval)
        local newTokens = math.min(maxTokens, tokens + tokensToAdd)
        remaining = newTokens - cost

        if remaining >= 0 then
          -- Update the time of the last refill depending on how many tokens we added
          lastRefill = lastRefill + tokensToAdd * fillInterval
          resetCost = (remaining < cost) and (cost - remaining) or cost
          redis.call("HMSET", key, "lastRefill", lastRefill, "tokens", remaining)
          redis.call("PEXPIRE", key, interval * 2)
        else
          resetCost = cost - tokens
        end
      end
    end
    
    reset = lastRefill + resetCost * fillInterval
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
      const nonNegativeRemaining = Math.max(0, remaining);
      if (ctx.cache && !success) {
        ctx.cache.blockUntil(localCacheIdentifier, reset);
      }

      return {
        success,
        limit: refillRate,
        remaining: nonNegativeRemaining,
        reset,
        pending: Promise.resolve(),
      };
    };
  }
}
