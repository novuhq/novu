import { Injectable, NotFoundException, Scope } from '@nestjs/common';

import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { decryptApiKey, PinoLogger } from '@novu/application-generic';
import { ShortIsPrefixEnum, EnvironmentEnum } from '@novu/shared';

import { GetMyEnvironmentsCommand } from './get-my-environments.command';
import { EnvironmentResponseDto } from '../../dtos/environment-response.dto';
import { buildSlug } from '../../../shared/helpers/build-slug';

@Injectable({
  scope: Scope.REQUEST,
})
export class GetMyEnvironments {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: GetMyEnvironmentsCommand): Promise<EnvironmentResponseDto[]> {
    this.logger.trace('Getting Environments');

    const environments = await this.environmentRepository.findOrganizationEnvironments(command.organizationId);

    if (!environments?.length)
      throw new NotFoundException(`No environments were found for organization ${command.organizationId}`);

    return environments.map((environment) => {
      const processedEnvironment = { ...environment };

      processedEnvironment.apiKeys = command.returnApiKeys ? this.decryptApiKeys(environment.apiKeys) : [];

      const shortEnvName = shortenEnvironmentName(processedEnvironment.name);

      return {
        ...processedEnvironment,
        slug: buildSlug(shortEnvName, ShortIsPrefixEnum.ENVIRONMENT, processedEnvironment._id),
      };
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
