import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Ratelimit } from '@upstash/ratelimit';
import { EvaluateApiRateLimitCommand } from './evaluate-api-rate-limit.command';
import { GetApiRateLimitMaximum } from '../get-api-rate-limit-maximum';
import { CacheService, InstrumentUsecase, buildEvaluateApiRateLimitKey } from '@novu/application-generic';
import { GetApiRateLimitAlgorithmConfig } from '../get-api-rate-limit-algorithm-config';
import { EvaluateApiRateLimitResponse } from './evaluate-api-rate-limit.types';
import { tokenBucketLimiter } from './evaluate-api-rate-limit.limiter';
import { GetApiRateLimitCostConfig } from '../get-api-rate-limit-cost-config';

const LOG_CONTEXT = 'EvaluateApiRateLimit';

type UpstashRedisClient = ConstructorParameters<typeof Ratelimit>[0]['redis'];

@Injectable()
export class EvaluateApiRateLimit {
  private ephemeralCache = new Map<string, number>();
  private algorithm = 'token bucket';

  constructor(
    private getApiRateLimitMaximum: GetApiRateLimitMaximum,
    private getApiRateLimitAlgorithmConfig: GetApiRateLimitAlgorithmConfig,
    private getApiRateLimitCostConfig: GetApiRateLimitCostConfig,
    private cacheService: CacheService
  ) {}

  @InstrumentUsecase()
  async execute(command: EvaluateApiRateLimitCommand): Promise<EvaluateApiRateLimitResponse> {
    const cacheClient = this.getCacheClient();

    if (!cacheClient) {
      const message = 'Rate limiting cache service is not available';
      Logger.error(message, LOG_CONTEXT);
      throw new ServiceUnavailableException(message);
    }

    const maxLimit = await this.getApiRateLimitMaximum.execute({
      apiRateLimitCategory: command.apiRateLimitCategory,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const { burstAllowance, windowDuration } = this.getApiRateLimitAlgorithmConfig.default;
    const refillRate = this.getRefillRate(maxLimit, windowDuration);
    const burstLimit = this.getBurstLimit(refillRate, burstAllowance);
    const cost = this.getCost(command);

    const ratelimit = new Ratelimit({
      redis: cacheClient,
      limiter: tokenBucketLimiter(refillRate, windowDuration, burstLimit, cost),
      prefix: '', // Empty cache key prefix to give us full control over the key format
      ephemeralCache: this.ephemeralCache,
    });

    const cacheKey = buildEvaluateApiRateLimitKey({
      _environmentId: command.environmentId,
      apiRateLimitCategory: command.apiRateLimitCategory,
    });

    try {
      const { success, limit, remaining, reset } = await ratelimit.limit(cacheKey);

      return {
        success,
        limit,
        remaining,
        reset,
        windowDuration,
        burstLimit,
        refillRate,
        algorithm: this.algorithm,
      };
    } catch (error) {
      const apiMessage = 'Failed to evaluate rate limit';
      const logMessage = `${apiMessage} for Organization: "${command.organizationId}". Error: "${error}"`;
      Logger.error(logMessage, LOG_CONTEXT);
      throw new ServiceUnavailableException(apiMessage);
    }
  }

  private getCacheClient(): UpstashRedisClient | null {
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

  private getRefillRate(limit: number, windowDuration: number): number {
    return limit * windowDuration;
  }

  private getBurstLimit(refillRate: number, burstAllowance: number): number {
    return Math.floor(refillRate * (1 + burstAllowance));
  }

  private getCost(command: EvaluateApiRateLimitCommand): number {
    const cost = this.getApiRateLimitCostConfig.default[command.apiRateLimitCost];

    return cost;
  }
}
