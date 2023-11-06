import { Injectable } from '@nestjs/common';
import { EnvironmentRepository, OrganizationRepository } from '@novu/dal';
import { buildApiRateLimitKey, CachedEntity } from '@novu/application-generic';
import { ApiRateLimitCategoryTypeEnum, ApiServiceLevelTypeEnum, IApiRateLimits } from '@novu/shared';
import { GetApiRateLimitCommand } from './get-api-rate-limit.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { GetDefaultApiRateLimits } from '../../../rate-limiting/usecases/get-default-api-rate-limits';

@Injectable()
export class GetApiRateLimit {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private organizationRespository: OrganizationRepository,
    private getDefaultApiRateLimits: GetDefaultApiRateLimits
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
        environmentApiRateLimits = this.getDefaultApiRateLimits.defaultApiRateLimits[organization.apiServiceLevel];
      } else {
        // TODO: NV-3067 - Remove this once all organizations have a service level
        environmentApiRateLimits = this.getDefaultApiRateLimits.defaultApiRateLimits[ApiServiceLevelTypeEnum.UNLIMITED];
      }
    }

    const apiRateLimit = environmentApiRateLimits[apiRateLimitCategory];

    return apiRateLimit;
  }
}
