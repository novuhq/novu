import { Injectable } from '@nestjs/common';
import {
  ApiRateLimitCategoryTypeEnum,
  ApiRateLimitEnvVarFormat,
  ApiServiceLevelTypeEnum,
  DEFAULT_API_RATE_LIMITS,
  IPlatformApiRateLimits,
} from '@novu/shared';

@Injectable()
export class GetDefaultApiRateLimits {
  public defaultApiRateLimits: IPlatformApiRateLimits;

  constructor() {
    this.loadApiRateLimits();
  }

  public loadApiRateLimits(): void {
    this.defaultApiRateLimits = this.createDefaultApiRateLimits();
  }

  private createDefaultApiRateLimits(): IPlatformApiRateLimits {
    const mergedApiRateLimits: IPlatformApiRateLimits = { ...DEFAULT_API_RATE_LIMITS };

    // Read process environment only once for performance
    const processEnv = process.env;

    Object.values(ApiServiceLevelTypeEnum).forEach((apiServiceLevel) => {
      Object.values(ApiRateLimitCategoryTypeEnum).forEach((apiRateLimitCategory) => {
        const envVarName = this.getEnvVarName(apiServiceLevel, apiRateLimitCategory);
        const envVarValue = processEnv[envVarName];

        if (envVarValue) {
          mergedApiRateLimits[apiServiceLevel][apiRateLimitCategory] = Number(envVarValue);
        }
      });
    });

    return mergedApiRateLimits;
  }

  private getEnvVarName(
    apiServiceLevel: ApiServiceLevelTypeEnum,
    apiRateLimitCategory: ApiRateLimitCategoryTypeEnum
  ): ApiRateLimitEnvVarFormat {
    return `API_RATE_LIMIT_${apiServiceLevel.toUpperCase() as Uppercase<ApiServiceLevelTypeEnum>}_${
      apiRateLimitCategory.toUpperCase() as Uppercase<ApiRateLimitCategoryTypeEnum>
    }`;
  }
}
