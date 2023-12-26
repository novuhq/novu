import { Injectable } from '@nestjs/common';
import { ApiRateLimitAlgorithmEnum } from '@novu/shared';
import { EvaluateApiRateLimitCommand } from './evaluate-api-rate-limit.command';
import { GetApiRateLimitMaximum, GetApiRateLimitMaximumCommand } from '../get-api-rate-limit-maximum';
import { InstrumentUsecase, buildEvaluateApiRateLimitKey } from '@novu/application-generic';
import { GetApiRateLimitAlgorithmConfig } from '../get-api-rate-limit-algorithm-config';
import { EvaluateApiRateLimitResponseDto } from './evaluate-api-rate-limit.types';
import { EvaluateTokenBucketRateLimit } from '../evaluate-token-bucket-rate-limit/evaluate-token-bucket-rate-limit.usecase';
import { GetApiRateLimitCostConfig } from '../get-api-rate-limit-cost-config';
import { EvaluateTokenBucketRateLimitCommand } from '../evaluate-token-bucket-rate-limit/evaluate-token-bucket-rate-limit.command';

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
    const [maxLimitPerSecond, apiServiceLevel] = await this.getApiRateLimitMaximum.execute(
      GetApiRateLimitMaximumCommand.create({
        apiRateLimitCategory: command.apiRateLimitCategory,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      })
    );

    const windowDuration = this.getApiRateLimitAlgorithmConfig.default[ApiRateLimitAlgorithmEnum.WINDOW_DURATION];
    const burstAllowance = this.getApiRateLimitAlgorithmConfig.default[ApiRateLimitAlgorithmEnum.BURST_ALLOWANCE];
    const cost = this.getApiRateLimitCostConfig.default[command.apiRateLimitCost];
    const maxTokensPerWindow = this.getMaxTokensPerWindow(maxLimitPerSecond, windowDuration);
    const refillRate = this.getRefillRate(maxLimitPerSecond, windowDuration);
    const burstLimit = this.getBurstLimit(maxTokensPerWindow, burstAllowance);

    const identifier = buildEvaluateApiRateLimitKey({
      _environmentId: command.environmentId,
      apiRateLimitCategory: command.apiRateLimitCategory,
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
