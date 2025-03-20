import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { CommunityOrganizationRepository, EnvironmentRepository } from '@novu/dal';
import { buildMaximumApiRateLimitKey, CachedEntity, Instrument, InstrumentUsecase } from '@novu/application-generic';
import {
  ApiRateLimitCategoryEnum,
  ApiRateLimitCategoryToFeatureName,
  ApiRateLimitServiceMaximumEnvVarFormat,
  ApiServiceLevelEnum,
  getFeatureForTierAsNumber,
  IApiRateLimitServiceMaximum,
} from '@novu/shared';
import { GetApiRateLimitMaximumCommand } from './get-api-rate-limit-maximum.command';
import { CUSTOM_API_SERVICE_LEVEL, GetApiRateLimitMaximumDto } from './get-api-rate-limit-maximum.dto';

const LOG_CONTEXT = 'GetApiRateLimit';

@Injectable()
export class GetApiRateLimitMaximum implements OnModuleInit {
  private apiRateLimitRecord: IApiRateLimitServiceMaximum;
  constructor(
    private environmentRepository: EnvironmentRepository,
    private organizationRepository: CommunityOrganizationRepository
  ) {}

  onModuleInit() {
    this.apiRateLimitRecord = this.buildApiRateLimitRecord();
  }

  @InstrumentUsecase()
  async execute(command: GetApiRateLimitMaximumCommand): Promise<GetApiRateLimitMaximumDto> {
    return await this.getApiRateLimit({
      apiRateLimitCategory: command.apiRateLimitCategory,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
  }

  @CachedEntity({
    builder: (command: { apiRateLimitCategory: ApiRateLimitCategoryEnum; _environmentId: string }) =>
      buildMaximumApiRateLimitKey({
        _environmentId: command._environmentId,
        apiRateLimitCategory: command.apiRateLimitCategory,
      }),
  })
  private async getApiRateLimit({
    apiRateLimitCategory,
    _environmentId,
    _organizationId,
  }: {
    apiRateLimitCategory: ApiRateLimitCategoryEnum;
    _environmentId: string;
    _organizationId: string;
  }): Promise<GetApiRateLimitMaximumDto> {
    const environment = await this.getEnvironment(_environmentId);

    if (environment.apiRateLimits) {
      return [environment.apiRateLimits[apiRateLimitCategory], CUSTOM_API_SERVICE_LEVEL];
    }
    const apiServiceLevel = await this.getOrganizationApiServiceLevel(_organizationId);
    const apiRateLimitRecord = this.apiRateLimitRecord[apiServiceLevel];

    return [apiRateLimitRecord[apiRateLimitCategory], apiServiceLevel];
  }

  private async getOrganizationApiServiceLevel(_organizationId: string): Promise<ApiServiceLevelEnum> {
    const organization = await this.organizationRepository.findById(_organizationId);

    if (!organization) {
      const message = `Organization id: ${_organizationId} not found`;
      Logger.error(message, LOG_CONTEXT);
      throw new InternalServerErrorException(message);
    }

    if (organization.apiServiceLevel) {
      return organization.apiServiceLevel;
    }

    return ApiServiceLevelEnum.UNLIMITED;
  }

  private async getEnvironment(_environmentId: string) {
    const environment = await this.environmentRepository.findOne({ _id: _environmentId });

    if (!environment) {
      const message = `Environment id: ${_environmentId} not found`;
      Logger.error(message, LOG_CONTEXT);
      throw new InternalServerErrorException(message);
    }

    return environment;
  }
  @Instrument()
  private buildApiRateLimitRecord(): IApiRateLimitServiceMaximum {
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
