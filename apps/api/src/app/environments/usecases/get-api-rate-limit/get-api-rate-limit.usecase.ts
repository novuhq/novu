import { Injectable } from '@nestjs/common';
import { EnvironmentRepository, OrganizationRepository } from '@novu/dal';
import { buildApiRateLimitKey, CachedEntity } from '@novu/application-generic';
import {
  ApiRateLimitCategoryTypeEnum,
  ApiServiceLevelTypeEnum,
  DEFAULT_API_RATE_LIMITS,
  IApiRateLimits,
} from '@novu/shared';
import { GetApiRateLimitCommand } from './get-api-rate-limit.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

const LOG_CONTEXT = 'GetApiRateLimit';

@Injectable()
export class GetApiRateLimit {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private organizationRespository: OrganizationRepository
  ) {}

  async execute(command: GetApiRateLimitCommand): Promise<number> {
    return await this.fetchApiRateLimit({
      apiRateLimitCategory: command.apiRateLimitCategory,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
  }

  @CachedEntity({
    builder: (command: GetApiRateLimitCommand) =>
      buildApiRateLimitKey({
        _environmentId: command.environmentId,
        apiRateLimitCategory: command.apiRateLimitCategory,
      }),
  })
  private async fetchApiRateLimit({
    apiRateLimitCategory,
    _environmentId,
    _organizationId,
  }: {
    apiRateLimitCategory: ApiRateLimitCategoryTypeEnum;
    _environmentId: string;
    _organizationId: string;
  }): Promise<number> {
    const environment = await this.environmentRepository.findOne({ _id: _environmentId });

    if (!environment) {
      throw new ApiException(`Environment id: ${_environmentId} not found`);
    }

    const { apiRateLimits } = environment;

    let environmentApiRateLimits: IApiRateLimits;
    if (apiRateLimits) {
      environmentApiRateLimits = apiRateLimits;
    } else {
      const organization = await this.organizationRespository.findOne({ _id: _organizationId });

      if (!organization) {
        throw new ApiException(`Organization id: ${_organizationId} not found`);
      }

      if (organization.apiServiceLevel) {
        environmentApiRateLimits = DEFAULT_API_RATE_LIMITS[organization.apiServiceLevel];
      } else {
        // TODO: NV-3067 - Remove this once all organizations have a service level
        environmentApiRateLimits = DEFAULT_API_RATE_LIMITS[ApiServiceLevelTypeEnum.UNLIMITED];
      }
    }

    const apiRateLimit = environmentApiRateLimits[apiRateLimitCategory];

    return apiRateLimit;
  }
}
