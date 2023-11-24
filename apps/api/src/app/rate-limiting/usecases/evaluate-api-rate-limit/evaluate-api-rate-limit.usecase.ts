import { Injectable } from '@nestjs/common';
import { EvaluateApiRateLimitCommand } from './evaluate-api-rate-limit.command';
import { GetApiRateLimitMaximum } from '../get-api-rate-limit-maximum';
import { InstrumentUsecase, buildEvaluateApiRateLimitKey } from '@novu/application-generic';
import { GetApiRateLimitAlgorithmConfig } from '../get-api-rate-limit-algorithm-config';
import { EvaluateApiRateLimitResponseDto } from './evaluate-api-rate-limit.types';
import { EvaluateTokenBucketRateLimit } from '../evaluate-token-bucket-rate-limit/evaluate-token-bucket-rate-limit.usecase';
import { GetApiRateLimitCostConfig } from '../get-api-rate-limit-cost-config';
import { EvaluateTokenBucketRateLimitCommand } from '../evaluate-token-bucket-rate-limit/evaluate-token-bucket-rate-limit.command';
import { ApiRateLimitAlgorithmEnum } from 'libs/shared/dist/cjs';

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
    const maxLimit = await this.getApiRateLimitMaximum.execute({
      apiRateLimitCategory: command.apiRateLimitCategory,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const defaultCost = this.getApiRateLimitCostConfig.default[command.apiRateLimitCategory];
    const windowDuration = this.getApiRateLimitAlgorithmConfig.default[ApiRateLimitAlgorithmEnum.WINDOW_DURATION];
    const burstAllowance = this.getApiRateLimitAlgorithmConfig.default[ApiRateLimitAlgorithmEnum.BURST_ALLOWANCE];
    const cost = this.getCost(command, defaultCost);
    const refillRate = this.getRefillRate(maxLimit, windowDuration);
    const burstLimit = this.getBurstLimit(maxLimit, burstAllowance);

    const identifier = buildEvaluateApiRateLimitKey({
      _environmentId: command.environmentId,
      apiRateLimitCategory: command.apiRateLimitCategory,
    });

    const { success, limit, remaining, reset } = await this.evaluateTokenBucketRateLimit.execute(
      EvaluateTokenBucketRateLimitCommand.create({
        identifier,
        maxLimit,
        windowDuration,
        cost,
        refillRate,
      })
    );

    return {
      success,
      limit,
      remaining,
      reset,
      windowDuration,
      burstLimit,
      refillRate,
      algorithm: this.evaluateTokenBucketRateLimit.algorithm,
      cost,
    };
  }

  private getCost(command: EvaluateApiRateLimitCommand, defaultCost: number): number {
    return defaultCost;
  }

  private getRefillRate(maxLimit: number, windowDuration: number): number {
    return maxLimit * windowDuration;
  }

  private getBurstLimit(maxLimit: number, burstAllowance: number): number {
    return Math.floor(maxLimit * (1 + burstAllowance));
  }
}
