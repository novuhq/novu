import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ApiRateLimitCategoryEnum,
  ApiRateLimitCategoryToFeatureName,
  ApiRateLimitServiceMaximumEnvVarFormat,
  ApiServiceLevelEnum,
  getFeatureForTierAsNumber,
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
  public default: IApiRateLimitServiceMaximum;

  constructor(
    private invalidateCache: InvalidateCacheService,
    private cacheService: CacheService
  ) {}

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

      await this.invalidateCache.invalidateByKey({
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
    // Read process environment only once for performance
    const processEnv = process.env;

    return Object.values(ApiServiceLevelEnum).reduce((acc, apiServiceLevel) => {
      acc[apiServiceLevel] = Object.values(ApiRateLimitCategoryEnum).reduce(
        (categoryAcc, apiRateLimitCategory) => {
          const featureName = ApiRateLimitCategoryToFeatureName[apiRateLimitCategory];
          const featureForTierAsNumber = getFeatureForTierAsNumber(featureName, apiServiceLevel);
          const envVarName = this.getEnvVarName(apiServiceLevel, apiRateLimitCategory);
          const envVarValue = processEnv[envVarName];

          // eslint-disable-next-line no-param-reassign
          categoryAcc[apiRateLimitCategory] = envVarValue ? Number(envVarValue) : featureForTierAsNumber;

          return categoryAcc;
        },
        {} as Record<ApiRateLimitCategoryEnum, number>
      );

      return acc;
    }, {} as IApiRateLimitServiceMaximum);
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
