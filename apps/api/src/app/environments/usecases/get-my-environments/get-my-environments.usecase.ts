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

    return await this.environmentRepository.findOrganizationEnvironments(command.organizationId);
  }
}
