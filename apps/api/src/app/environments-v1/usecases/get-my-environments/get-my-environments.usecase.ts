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
      if (command.includeAllApiKeys || environment._id === command.environmentId) {
        return this.decryptApiKeys(environment);
      }
      // TODO: For api_v2: Remove the key from the response. This was not done yet as it's a breaking change.
      // eslint-disable-next-line no-param-reassign
      environment.apiKeys = [];

      return environment;
    });
  }

  private decryptApiKeys(environment: EnvironmentEntity): EnvironmentResponseDto {
    const decryptedApiKeysEnvironment = { ...environment };

    decryptedApiKeysEnvironment.apiKeys = environment.apiKeys.map((apiKey) => {
      return {
        ...apiKey,
        key: decryptApiKey(apiKey.key),
      };
    });

    const shortEnvName = shortenEnvironmentName(decryptedApiKeysEnvironment.name);

    return {
      ...decryptedApiKeysEnvironment,
      slug: buildSlug(shortEnvName, ShortIsPrefixEnum.ENVIRONMENT, decryptedApiKeysEnvironment._id),
    };
  }
}
function shortenEnvironmentName(name: string): string {
  const mapToShotEnvName: Record<EnvironmentEnum, string> = {
    [EnvironmentEnum.PRODUCTION]: 'prod',
    [EnvironmentEnum.DEVELOPMENT]: 'dev',
  };

  return mapToShotEnvName[name] || name;
}
