import { Injectable } from '@nestjs/common';
import {
  ApiRateLimitCostEnum,
  ApiRateLimitCostEnvVarFormat,
  DEFAULT_API_RATE_LIMIT_COST_CONFIG,
  IApiRateLimitCost,
} from '@novu/shared';

@Injectable()
export class GetApiRateLimitCostConfig {
  public default: IApiRateLimitCost;

  constructor() {
    this.loadDefault();
  }

  public loadDefault(): void {
    this.default = this.createDefault();
  }

  private createDefault(): IApiRateLimitCost {
    const mergedConfig: IApiRateLimitCost = { ...DEFAULT_API_RATE_LIMIT_COST_CONFIG };

    // Read process environment only once for performance
    const processEnv = process.env;

    Object.values(ApiRateLimitCostEnum).forEach((costOption) => {
      const envVarName = this.getEnvVarName(costOption);
      const envVarValue = processEnv[envVarName];

      if (envVarValue) {
        mergedConfig[costOption] = Number(envVarValue);
      }
    });

    return mergedConfig;
  }

  private getEnvVarName(costOption: ApiRateLimitCostEnum): ApiRateLimitCostEnvVarFormat {
    return `API_RATE_LIMIT_COST_${costOption.toUpperCase() as Uppercase<ApiRateLimitCostEnum>}`;
  }
}
