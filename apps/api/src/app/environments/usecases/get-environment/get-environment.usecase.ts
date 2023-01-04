import { Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import { GetEnvironmentCommand } from './get-environment.command';

@Injectable()
export class GetEnvironment {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: GetEnvironmentCommand) {
    const environment = await this.environmentRepository.findOne(
      {
        _id: command.environmentId,
        _organizationId: command.organizationId,
      },
      '-apiKeys'
    );

    if (!environment) throw new NotFoundException(`Environment ${command.environmentId} not found`);

    return environment;
  }
}
