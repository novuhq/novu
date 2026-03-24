import { Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentVariableRepository } from '@novu/dal';
import { EnvironmentVariableResponseDto } from '../../dtos/environment-variable-response.dto';
import { toEnvironmentVariableResponseDto } from '../get-environment-variables/get-environment-variables.usecase';
import { GetEnvironmentVariableCommand } from './get-environment-variable.command';

@Injectable()
export class GetEnvironmentVariable {
  constructor(private environmentVariableRepository: EnvironmentVariableRepository) {}

  async execute(command: GetEnvironmentVariableCommand): Promise<EnvironmentVariableResponseDto> {
    const variable = await this.environmentVariableRepository.findById(
      { _id: command.variableId, _organizationId: command.organizationId },
      '*'
    );

    if (!variable) {
      throw new NotFoundException(`Environment variable with id ${command.variableId} not found`);
    }

    return toEnvironmentVariableResponseDto(variable);
  }
}
