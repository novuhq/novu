import { Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentVariableRepository } from '@novu/dal';
import { EnvironmentVariableResponseDto } from '../../dtos/environment-variable-response.dto';
import { toEnvironmentVariableResponseDto } from '../get-environment-variables/get-environment-variables.usecase';
import { GetEnvironmentVariableCommand } from './get-environment-variable.command';

@Injectable()
export class GetEnvironmentVariable {
  constructor(private environmentVariableRepository: EnvironmentVariableRepository) {}

  async execute(command: GetEnvironmentVariableCommand): Promise<EnvironmentVariableResponseDto> {
    const variable = await this.environmentVariableRepository.findOne(
      { key: command.variableKey, _organizationId: command.organizationId },
      '*'
    );

    if (!variable) {
      throw new NotFoundException(`Environment variable with key "${command.variableKey}" not found`);
    }

    return toEnvironmentVariableResponseDto(variable);
  }
}
