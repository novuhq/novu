import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Ratelimit } from '@upstash/ratelimit';
import { EvaluateTokenBucketRateLimitCommand } from './evaluate-token-bucket-rate-limit.command';
import { CacheService, InstrumentUsecase } from '@novu/application-generic';
import {
  EvaluateTokenBucketRateLimitResponseDto,
  RegionLimiter,
  UpstashRedisClient,
} from './evaluate-token-bucket-rate-limit.types';
import { tokenBucketLimiter } from './evaluate-token-bucket-rate-limit.limiter';

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
      limiter: this.createLimiter(command.refillRate, command.windowDuration, command.maxTokens, command.cost),
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

  public createLimiter(refillRate: number, windowDuration: number, maxTokens: number, cost: number): RegionLimiter {
    return tokenBucketLimiter(refillRate, windowDuration, maxTokens, cost);
  }
}
