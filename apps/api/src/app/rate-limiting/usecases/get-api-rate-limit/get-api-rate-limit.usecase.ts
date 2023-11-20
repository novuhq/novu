import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { EnvironmentRepository, OrganizationRepository } from '@novu/dal';
import { buildMaximumApiRateLimitKey, CachedEntity } from '@novu/application-generic';
import { ApiRateLimitCategoryTypeEnum, ApiServiceLevelTypeEnum, IApiRateLimits } from '@novu/shared';
import { GetApiRateLimitCommand } from './get-api-rate-limit.command';
import { GetDefaultApiRateLimits } from '../get-default-api-rate-limits';

const LOG_CONTEXT = 'GetApiRateLimit';

@Injectable()
export class GetApiRateLimit {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private organizationRepository: OrganizationRepository,
    private getDefaultApiRateLimits: GetDefaultApiRateLimits
  ) {}

  async execute(command: GetApiRateLimitCommand): Promise<number> {
    return await this.getApiRateLimit({
      apiRateLimitCategory: command.apiRateLimitCategory,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
  }

  @CachedEntity({
    builder: (command: GetApiRateLimitCommand) =>
      buildMaximumApiRateLimitKey({
        _environmentId: command.environmentId,
        apiRateLimitCategory: command.apiRateLimitCategory,
      }),
  })
  private async getApiRateLimit({
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
      const message = `Environment id: ${_environmentId} not found`;
      Logger.error(message, LOG_CONTEXT);
      throw new InternalServerErrorException(message);
    }

    const { apiRateLimits } = environment;

    let environmentApiRateLimits: IApiRateLimits;
    if (apiRateLimits) {
      environmentApiRateLimits = apiRateLimits;
    } else {
      const organization = await this.organizationRepository.findOne({ _id: _organizationId });

      if (!organization) {
        const message = `Organization id: ${_organizationId} not found`;
        Logger.error(message, LOG_CONTEXT);
        throw new InternalServerErrorException(message);
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
