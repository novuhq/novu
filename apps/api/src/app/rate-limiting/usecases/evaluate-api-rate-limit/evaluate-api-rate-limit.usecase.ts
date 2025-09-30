import { Injectable } from '@nestjs/common';
import { buildEvaluateApiRateLimitKey, InstrumentUsecase } from '@novu/application-generic';
import {
  ApiRateLimitAlgorithmEnum,
  ApiServiceLevelEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
} from '@novu/shared';
import { EvaluateTokenBucketRateLimitCommand } from '../evaluate-token-bucket-rate-limit/evaluate-token-bucket-rate-limit.command';
import { EvaluateTokenBucketRateLimit } from '../evaluate-token-bucket-rate-limit/evaluate-token-bucket-rate-limit.usecase';
import { GetApiRateLimitAlgorithmConfig } from '../get-api-rate-limit-algorithm-config';
import { GetApiRateLimitCostConfig } from '../get-api-rate-limit-cost-config';
import { GetApiRateLimitMaximum, GetApiRateLimitMaximumCommand } from '../get-api-rate-limit-maximum';
import type { ApiServiceLevel } from '../get-api-rate-limit-maximum/get-api-rate-limit-maximum.dto';
import { EvaluateApiRateLimitCommand } from './evaluate-api-rate-limit.command';
import { EvaluateApiRateLimitResponseDto } from './evaluate-api-rate-limit.types';

@Injectable()
export class EvaluateApiRateLimit {
  constructor(
    private getApiRateLimitMaximum: GetApiRateLimitMaximum,
    private getApiRateLimitAlgorithmConfig: GetApiRateLimitAlgorithmConfig,
    private getApiRateLimitCostConfig: GetApiRateLimitCostConfig,
    private evaluateTokenBucketRateLimit: EvaluateTokenBucketRateLimit
  ) {}

  @InstrumentUsecase()
  async execute(command: EvaluateApiRateLimitCommand): Promise<EvaluateApiRateLimitResponseDto> {
    let maxLimitPerSecond: number;
    let apiServiceLevel: ApiServiceLevel;

    // For keyless environments, we implement strict rate limiting to prevent abuse:
    if (!command.organizationId || !command.environmentId) {
      maxLimitPerSecond = 3000;
      apiServiceLevel = ApiServiceLevelEnum.ENTERPRISE;
    } else {
      [maxLimitPerSecond, apiServiceLevel] = await this.getApiRateLimitMaximum.execute(
        GetApiRateLimitMaximumCommand.create({
          apiRateLimitCategory: command.apiRateLimitCategory,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        })
      );
    }

    const windowDuration = this.getApiRateLimitAlgorithmConfig.default[ApiRateLimitAlgorithmEnum.WINDOW_DURATION];
    const burstAllowance = this.getApiRateLimitAlgorithmConfig.default[ApiRateLimitAlgorithmEnum.BURST_ALLOWANCE];
    const cost = this.getApiRateLimitCostConfig.default[command.apiRateLimitCost];
    const maxTokensPerWindow = this.getMaxTokensPerWindow(maxLimitPerSecond, windowDuration);
    const refillRate = this.getRefillRate(maxLimitPerSecond, windowDuration);
    const burstLimit = this.getBurstLimit(maxTokensPerWindow, burstAllowance);

    // For keyless authentication, we'll use both environment and IP-based rate limiting
    const identifier = buildEvaluateApiRateLimitKey({
      _environmentId: command.environmentId || 'keyless_env',
      apiRateLimitCategory: command.ip
        ? `${command.apiRateLimitCategory}:ip=${command.ip}`
        : command.apiRateLimitCategory,
    });

    const { success, remaining, reset } = await this.evaluateTokenBucketRateLimit.execute(
      EvaluateTokenBucketRateLimitCommand.create({
        identifier,
        maxTokens: burstLimit,
        windowDuration,
        cost,
        refillRate,
      })
    );

    return {
      success,
      limit: maxTokensPerWindow,
      remaining,
      reset,
      windowDuration,
      burstLimit,
      refillRate,
      algorithm: this.evaluateTokenBucketRateLimit.algorithm,
      cost,
      apiServiceLevel,
    };
  }

  private getMaxTokensPerWindow(maxLimit: number, windowDuration: number): number {
    return maxLimit * windowDuration;
  }

  private getRefillRate(maxLimit: number, windowDuration: number): number {
    /*
     * Refill rate is currently set to the max tokens per window.
     * This can be changed to a different value to implement adaptive rate limiting.
     */
    return this.getMaxTokensPerWindow(maxLimit, windowDuration);
  }

  private getBurstLimit(maxTokensPerWindow: number, burstAllowance: number): number {
    return Math.floor(maxTokensPerWindow * (1 + burstAllowance));
  }
}
