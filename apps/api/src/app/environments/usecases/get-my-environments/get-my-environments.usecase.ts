import { Injectable, Logger, Scope } from '@nestjs/common';
import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';
import { GetMyEnvironmentsCommand } from './get-my-environments.command';

@Injectable({
  scope: Scope.REQUEST,
})
export class GetMyEnvironments {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: GetMyEnvironmentsCommand): Promise<EnvironmentEntity[]> {
    Logger.verbose('Getting Environments');

    const environments = await this.environmentRepository.findOrganizationEnvironments(command.organizationId);

    return environments.map((environment) => {
      if (environment._id === command.environmentId) {
        return environment;
      }

      environment.apiKeys = [];

      return environment;
    });
  }
}
