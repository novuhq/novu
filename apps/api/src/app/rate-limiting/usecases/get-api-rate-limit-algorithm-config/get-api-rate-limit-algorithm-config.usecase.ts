import { Injectable } from '@nestjs/common';
import {
  ApiRateLimitAlgorithmEnum,
  ApiRateLimitAlgorithmEnvVarFormat,
  DEFAULT_API_RATE_LIMIT_ALGORITHM_CONFIG,
  IApiRateLimitAlgorithm,
} from '@novu/shared';

@Injectable()
export class GetApiRateLimitAlgorithmConfig {
  public default: IApiRateLimitAlgorithm;

  constructor() {
    this.loadDefault();
  }

  public loadDefault(): void {
    this.default = this.createDefault();
  }

  private createDefault(): IApiRateLimitAlgorithm {
    const mergedConfig: IApiRateLimitAlgorithm = { ...DEFAULT_API_RATE_LIMIT_ALGORITHM_CONFIG };

    // Read process environment only once for performance
    const processEnv = process.env;

    Object.values(ApiRateLimitAlgorithmEnum).forEach((algorithmOption) => {
      const envVarName = this.getEnvVarName(algorithmOption);
      const envVarValue = processEnv[envVarName];

      if (envVarValue) {
        mergedConfig[algorithmOption] = Number(envVarValue);
      }
    });

    return mergedConfig;
  }

  private getEnvVarName(algorithmOption: ApiRateLimitAlgorithmEnum): ApiRateLimitAlgorithmEnvVarFormat {
    return `API_RATE_LIMIT_ALGORITHM_${algorithmOption.toUpperCase() as Uppercase<ApiRateLimitAlgorithmEnum>}`;
  }
}
