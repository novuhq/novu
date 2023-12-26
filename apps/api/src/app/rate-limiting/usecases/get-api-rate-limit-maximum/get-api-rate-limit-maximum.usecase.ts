import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { EnvironmentRepository, OrganizationRepository } from '@novu/dal';
import { buildMaximumApiRateLimitKey, CachedEntity, InstrumentUsecase } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, ApiServiceLevelEnum, IApiRateLimitMaximum } from '@novu/shared';
import { GetApiRateLimitMaximumCommand } from './get-api-rate-limit-maximum.command';
import { GetApiRateLimitServiceMaximumConfig } from '../get-api-rate-limit-service-maximum-config';
import { ApiServiceLevel, CUSTOM_API_SERVICE_LEVEL, GetApiRateLimitMaximumDto } from './get-api-rate-limit-maximum.dto';

const LOG_CONTEXT = 'GetApiRateLimit';

@Injectable()
export class GetApiRateLimitMaximum {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private organizationRepository: OrganizationRepository,
    private getDefaultApiRateLimits: GetApiRateLimitServiceMaximumConfig
  ) {}

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
    const environment = await this.environmentRepository.findOne({ _id: _environmentId });

    if (!environment) {
      const message = `Environment id: ${_environmentId} not found`;
      Logger.error(message, LOG_CONTEXT);
      throw new InternalServerErrorException(message);
    }

    let apiRateLimits: IApiRateLimitMaximum;
    let apiServiceLevel: ApiServiceLevel;
    if (environment.apiRateLimits) {
      apiServiceLevel = CUSTOM_API_SERVICE_LEVEL;
      apiRateLimits = environment.apiRateLimits;
    } else {
      const organization = await this.organizationRepository.findOne({ _id: _organizationId });

      if (!organization) {
        const message = `Organization id: ${_organizationId} not found`;
        Logger.error(message, LOG_CONTEXT);
        throw new InternalServerErrorException(message);
      }

      if (organization.apiServiceLevel) {
        apiServiceLevel = organization.apiServiceLevel;
      } else {
        // TODO: NV-3067 - Remove this once all organizations have a service level
        apiServiceLevel = ApiServiceLevelEnum.UNLIMITED;
      }
      apiRateLimits = this.getDefaultApiRateLimits.default[apiServiceLevel];
    }

    const apiRateLimit = apiRateLimits[apiRateLimitCategory];

    return [apiRateLimit, apiServiceLevel];
  }
}
