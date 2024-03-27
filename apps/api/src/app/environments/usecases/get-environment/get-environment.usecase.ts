import { Injectable, NotFoundException } from '@nestjs/common';

import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';

import { GetEnvironmentCommand } from './get-environment.command';
import { EnvironmentResponseDto } from '../../dtos/environment-response.dto';

@Injectable()
export class GetEnvironment {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: GetEnvironmentCommand): Promise<EnvironmentResponseDto> {
    const environment: Omit<EnvironmentEntity, 'apiKeys'> | null = await this.environmentRepository.findOne(
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
