import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ApiRateLimitCategoryEnum,
  ApiRateLimitServiceMaximumEnvVarFormat,
  ApiServiceLevelEnum,
  DEFAULT_API_RATE_LIMIT_SERVICE_MAXIMUM_CONFIG,
  IApiRateLimitServiceMaximum,
} from '@novu/shared';
import { createHash } from 'crypto';
import {
  buildMaximumApiRateLimitKey,
  buildServiceConfigApiRateLimitMaximumKey,
  CacheService,
  InvalidateCacheService,
} from '@novu/application-generic';

@Injectable()
export class GetApiRateLimitServiceMaximumConfig implements OnModuleInit {
  public default: IApiRateLimitServiceMaximum = DEFAULT_API_RATE_LIMIT_SERVICE_MAXIMUM_CONFIG;

  constructor(private invalidateCache: InvalidateCacheService, private cacheService: CacheService) {}

  async onModuleInit() {
    await this.loadDefault();
  }

  public async loadDefault(): Promise<void> {
    const newDefault = this.createDefault();
    this.default = newDefault;

    if (!this.cacheService.cacheEnabled()) {
      return;
    }

    const cacheKey = buildServiceConfigApiRateLimitMaximumKey();
    const previousHash = await this.cacheService.get(cacheKey);
    const newHash = this.getConfigHash(newDefault);

    if (previousHash !== newHash) {
      Logger.log(`Updating API Rate Limit Maximum config cache`, GetApiRateLimitServiceMaximumConfig.name);
      await this.cacheService.set(cacheKey, newHash);

      this.invalidateCache.invalidateByKey({
        key: buildMaximumApiRateLimitKey({
          _environmentId: '*',
          apiRateLimitCategory: '*',
        }),
      });
    }
  }

  private getConfigHash(config: IApiRateLimitServiceMaximum): string {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(config));

    return hash.digest('hex');
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
