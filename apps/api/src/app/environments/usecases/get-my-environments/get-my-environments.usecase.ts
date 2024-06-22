import { Injectable, Logger, NotFoundException, Scope } from '@nestjs/common';

import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { decryptApiKey } from '@novu/application-generic';

import { GetMyEnvironmentsCommand } from './get-my-environments.command';
import { EnvironmentResponseDto } from '../../dtos/environment-response.dto';

@Injectable({
  scope: Scope.REQUEST,
})
export class GetMyEnvironments {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: GetMyEnvironmentsCommand): Promise<EnvironmentResponseDto[]> {
    Logger.verbose('Getting Environments');

    const environments = await this.environmentRepository.findOrganizationEnvironments(command.organizationId);

    if (!environments?.length)
      throw new NotFoundException(`No environments were found for organization ${command.organizationId}`);

    // TODO: Figure out why removing apiKeys attribute from Mongoose didn't work
    return environments.map(({ apiKeys, ...rest }) => rest);
  }

  private decryptApiKeys(environment: EnvironmentEntity): EnvironmentResponseDto {
    const decryptedApiKeysEnvironment = { ...environment };

    decryptedApiKeysEnvironment.apiKeys = environment.apiKeys.map((apiKey) => {
      return {
        ...apiKey,
        key: decryptApiKey(apiKey.key),
      };
    });

    return decryptedApiKeysEnvironment;
  }
}
