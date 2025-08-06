import { Injectable, NotFoundException, Scope } from '@nestjs/common';
import { decryptApiKey, FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { EnvironmentEnum, EnvironmentTypeEnum, FeatureFlagsKeysEnum, ShortIsPrefixEnum } from '@novu/shared';
import { buildSlug } from '../../../shared/helpers/build-slug';
import { EnvironmentResponseDto } from '../../dtos/environment-response.dto';
import { GetMyEnvironmentsCommand } from './get-my-environments.command';

@Injectable({
  scope: Scope.REQUEST,
})
export class GetMyEnvironments {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private logger: PinoLogger,
    private featureFlagsService: FeatureFlagsService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: GetMyEnvironmentsCommand): Promise<EnvironmentResponseDto[]> {
    this.logger.trace('Getting Environments');

    const environments = await this.environmentRepository.findOrganizationEnvironments(command.organizationId);

    if (!environments?.length) {
      throw new NotFoundException(`No environments were found for organization ${command.organizationId}`);
    }

    const isNewChangeMechanismEnabled = await this.isNewChangeMechanismEnabled(command);

    return environments.map((environment) => {
      const processedEnvironment = { ...environment };

      processedEnvironment.apiKeys = command.returnApiKeys ? this.decryptApiKeys(environment.apiKeys) : [];

      // Override environment type to DEV if feature flag is disabled
      if (!isNewChangeMechanismEnabled) {
        processedEnvironment.type = EnvironmentTypeEnum.DEV;
      }

      const shortEnvName = shortenEnvironmentName(processedEnvironment.name);

      return {
        ...processedEnvironment,
        slug: buildSlug(shortEnvName, ShortIsPrefixEnum.ENVIRONMENT, processedEnvironment._id),
      };
    });
  }

  private async isNewChangeMechanismEnabled(command: GetMyEnvironmentsCommand): Promise<boolean> {
    return await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_NEW_CHANGE_MECHANISM_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
    });
  }

  private decryptApiKeys(apiKeys: EnvironmentEntity['apiKeys']) {
    return apiKeys.map((apiKey) => ({
      ...apiKey,
      key: decryptApiKey(apiKey.key),
    }));
  }
}

function shortenEnvironmentName(name: string): string {
  const mapToShotEnvName: Record<EnvironmentEnum, string> = {
    [EnvironmentEnum.PRODUCTION]: 'prod',
    [EnvironmentEnum.DEVELOPMENT]: 'dev',
  };

  return mapToShotEnvName[name] || name;
}
