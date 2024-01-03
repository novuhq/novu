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
      throw new NotFoundException(`Environments for organization ${command.organizationId} not found`);

    return environments.map((environment) => {
      if (environment._id === command.environmentId) {
        return this.decryptApiKeys(environment);
      }

      environment.apiKeys = [];

      return environment;
    });
  }

  private decryptApiKeys(environment: EnvironmentEntity): EnvironmentResponseDto {
    const res = { ...environment };

    res.apiKeys = environment.apiKeys.map((apiKey) => {
      return {
        _userId: apiKey._userId,
        key: decryptApiKey(apiKey.key),
      };
    });

    return res;
  }
}
