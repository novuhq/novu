import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Ratelimit } from '@upstash/ratelimit';
import { EvaluateApiRateLimitCommand } from './evaluate-api-rate-limit.command';
import { GetApiRateLimit } from '../get-api-rate-limit';
import { CacheService, buildEvaluateApiRateLimitKey } from '@novu/application-generic';
import { GetApiRateLimitConfiguration } from '../get-api-rate-limit-configuration';

const LOG_CONTEXT = 'EvaluateApiRateLimit';

type UpstashRedisClient = ConstructorParameters<typeof Ratelimit>[0]['redis'];

@Injectable()
export class EvaluateApiRateLimit {
  private ephemeralCache = new Map<string, number>();

  constructor(
    private getApiRateLimit: GetApiRateLimit,
    private getApiRateLimitConfiguration: GetApiRateLimitConfiguration,
    private cacheService: CacheService
  ) {}

  async execute(command: EvaluateApiRateLimitCommand): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const cacheClient = this.getCacheClient();

    if (!cacheClient) {
      const message = 'Rate limiting cache service is not available';
      Logger.error(message, LOG_CONTEXT);
      throw new ServiceUnavailableException(message);
    }

    const maxLimit = await this.getApiRateLimit.execute({
      apiRateLimitCategory: command.apiRateLimitCategory,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const { burstAllowance, refillInterval } = this.getApiRateLimitConfiguration.defaultApiRateLimitConfiguration;
    const burstLimit = this.getBurstLimit(maxLimit, burstAllowance);
    const refillRate = this.getRefillRate(maxLimit, refillInterval);

    const ratelimit = new Ratelimit({
      redis: cacheClient,
      limiter: Ratelimit.tokenBucket(refillRate, `${refillInterval} s`, burstLimit),
      prefix: '', // Empty cache key prefix to give us full control over the key format
      ephemeralCache: this.ephemeralCache,
    });

    const cacheKey = buildEvaluateApiRateLimitKey({
      _environmentId: command.environmentId,
      apiRateLimitCategory: command.apiRateLimitCategory,
    });

    try {
      /**
       * For the algorithm and Lua script:
       * @see https://github.com/upstash/ratelimit/blob/de9d6f3decf4bb5b8dbbe7ae9058b383ab4d0692/src/single.ts#L292
       */
      const { success, limit, remaining, reset } = await ratelimit.limit(cacheKey);

      return {
        success,
        limit,
        remaining,
        reset,
      };
    } catch (error) {
      const message = 'Failed to evaluate rate limit';
      Logger.error(message, LOG_CONTEXT);
      Logger.error(error, LOG_CONTEXT);
      throw new ServiceUnavailableException(message);
    }
  }

  private getCacheClient(): UpstashRedisClient | null {
    if (!this.cacheService.cacheEnabled()) {
      return null;
    }

    // Adapter for the @upstash/redis client -> cache client
    return {
      sadd: async (key, ...members) => this.cacheService.sadd(key, ...members.map((member) => String(member))),
      eval: async (script, keys, ...args) => this.cacheService.eval(script, keys, ...args.map((arg) => String(arg))),
    };
  }

  private getBurstLimit(limit: number, burstAllowance: number): number {
    return Math.floor(limit * (1 + burstAllowance));
  }

  private getRefillRate(limit: number, refillInterval: number): number {
    return limit * refillInterval;
  }
}
