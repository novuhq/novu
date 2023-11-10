import { Injectable } from '@nestjs/common';
import {
  ApiRateLimitConfigurationEnum,
  ApiRateLimitConfigurationEnvVarFormat,
  DEFAULT_API_RATE_LIMIT_CONFIGURATION,
  IApiRateLimitConfiguration,
} from '@novu/shared';

@Injectable()
export class GetApiRateLimitConfiguration {
  public defaultApiRateLimitConfiguration: IApiRateLimitConfiguration;

  constructor() {
    this.loadApiRateLimitConfiguration();
  }

  public loadApiRateLimitConfiguration(): void {
    this.defaultApiRateLimitConfiguration = this.createDefaultApiRateLimits();
  }

  private createDefaultApiRateLimits(): IApiRateLimitConfiguration {
    const mergedApiRateLimits: IApiRateLimitConfiguration = { ...DEFAULT_API_RATE_LIMIT_CONFIGURATION };

    // Read process environment only once for performance
    const processEnv = process.env;

    Object.values(ApiRateLimitConfigurationEnum).forEach((apiRateLimitConfiguration) => {
      const envVarName = this.getEnvVarName(apiRateLimitConfiguration);
      const envVarValue = processEnv[envVarName];

      if (envVarValue) {
        mergedApiRateLimits[apiRateLimitConfiguration] = Number(envVarValue);
      }
    });

    return mergedApiRateLimits;
  }

  private getEnvVarName(
    apiRateLevelConfiguration: ApiRateLimitConfigurationEnum
  ): ApiRateLimitConfigurationEnvVarFormat {
    return `API_RATE_LIMIT_${apiRateLevelConfiguration.toUpperCase() as Uppercase<ApiRateLimitConfigurationEnum>}`;
  }
}
