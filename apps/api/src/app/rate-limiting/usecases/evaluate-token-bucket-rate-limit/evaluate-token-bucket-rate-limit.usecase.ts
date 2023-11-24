import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Ratelimit } from '@upstash/ratelimit';
import { EvaluateTokenBucketRateLimitCommand } from './evaluate-token-bucket-rate-limit.command';
import { CacheService, InstrumentUsecase } from '@novu/application-generic';
import { EvaluateTokenBucketRateLimitResponseDto, RegionLimiter } from './evaluate-token-bucket-rate-limit.types';
import { tokenBucketLimiter } from './evaluate-token-bucket-rate-limit.limiter';

const LOG_CONTEXT = 'EvaluateTokenBucketRateLimit';

type UpstashRedisClient = ConstructorParameters<typeof Ratelimit>[0]['redis'];

@Injectable()
export class EvaluateTokenBucketRateLimit {
  private ephemeralCache = new Map<string, number>();
  public algorithm = 'token bucket';

  constructor(private cacheService: CacheService) {}

  @InstrumentUsecase()
  async execute(command: EvaluateTokenBucketRateLimitCommand): Promise<EvaluateTokenBucketRateLimitResponseDto> {
    const cacheClient = this.getCacheClient();

    if (!cacheClient) {
      const message = 'Rate limiting cache service is not available';
      Logger.error(message, LOG_CONTEXT);
      throw new ServiceUnavailableException(message);
    }

    const ratelimit = new Ratelimit({
      redis: cacheClient,
      limiter: this.createLimiter(command),
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

  public getCacheClient(): UpstashRedisClient | null {
    if (!this.cacheService.cacheEnabled()) {
      return null;
    }

    // Adapter for the @upstash/redis client -> cache client
    return {
      sadd: async (key, ...members) => this.cacheService.sadd(key, ...members.map((member) => String(member))),
      eval: async (script, keys, args) =>
        this.cacheService.eval(
          script,
          keys,
          args.map((arg) => String(arg))
        ),
    };
  }

  public createLimiter(command: EvaluateTokenBucketRateLimitCommand): RegionLimiter {
    const { windowDuration, maxLimit, refillRate, cost } = command;

    return tokenBucketLimiter(refillRate, windowDuration, maxLimit, cost);
  }
}
