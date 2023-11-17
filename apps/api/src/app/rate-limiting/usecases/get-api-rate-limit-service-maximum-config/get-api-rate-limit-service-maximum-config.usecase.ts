import { Injectable } from '@nestjs/common';
import {
  ApiRateLimitCategoryEnum,
  ApiRateLimitServiceMaximumEnvVarFormat,
  ApiServiceLevelEnum,
  DEFAULT_API_RATE_LIMIT_SERVICE_MAXIMUM_CONFIG,
  IApiRateLimitServiceMaximum,
} from '@novu/shared';

@Injectable()
export class GetApiRateLimitServiceMaximumConfig {
  public default: IApiRateLimitServiceMaximum;

  constructor() {
    this.loadDefault();
  }

  public loadDefault(): void {
    this.default = this.createDefault();
  }

  private createDefault(): IApiRateLimitServiceMaximum {
    const mergedConfig: IApiRateLimitServiceMaximum = { ...DEFAULT_API_RATE_LIMIT_SERVICE_MAXIMUM_CONFIG };

    // Read process environment only once for performance
    const processEnv = process.env;

    Object.values(ApiServiceLevelEnum).forEach((apiServiceLevel) => {
      Object.values(ApiRateLimitCategoryEnum).forEach((apiRateLimitCategory) => {
        const envVarName = this.getEnvVarName(apiServiceLevel, apiRateLimitCategory);
        const envVarValue = processEnv[envVarName];

        if (envVarValue) {
          mergedConfig[apiServiceLevel][apiRateLimitCategory] = Number(envVarValue);
        }
      });
    });

    return mergedConfig;
  }

  private getEnvVarName(
    apiServiceLevel: ApiServiceLevelEnum,
    apiRateLimitCategory: ApiRateLimitCategoryEnum
  ): ApiRateLimitServiceMaximumEnvVarFormat {
    return `API_RATE_LIMIT_MAXIMUM_${apiServiceLevel.toUpperCase() as Uppercase<ApiServiceLevelEnum>}_${
      apiRateLimitCategory.toUpperCase() as Uppercase<ApiRateLimitCategoryEnum>
    }`;
  }
}
