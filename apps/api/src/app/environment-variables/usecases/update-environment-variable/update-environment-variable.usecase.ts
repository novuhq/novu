import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { encryptSecret } from '@novu/application-generic';
import { EnvironmentVariableRepository } from '@novu/dal';
import { EnvironmentVariableResponseDto } from '../../dtos/environment-variable-response.dto';
import { toEnvironmentVariableResponseDto } from '../get-environment-variables/get-environment-variables.usecase';
import { UpdateEnvironmentVariableCommand } from './update-environment-variable.command';

@Injectable()
export class UpdateEnvironmentVariable {
  constructor(private environmentVariableRepository: EnvironmentVariableRepository) {}

  async execute(command: UpdateEnvironmentVariableCommand): Promise<EnvironmentVariableResponseDto> {
    const existing = await this.environmentVariableRepository.findById(
      { _id: command.variableId, _organizationId: command.organizationId },
      ['_id']
    );

    if (!existing) {
      throw new NotFoundException(`Environment variable with id ${command.variableId} not found`);
    }

    const updateBody: Record<string, unknown> = {};

    if (command.key !== undefined) {
      updateBody.key = command.key;
    }
    if (command.type !== undefined) {
      updateBody.type = command.type;
    }
    if (command.isSecret !== undefined) {
      updateBody.isSecret = command.isSecret;
    }

    if (command.values !== undefined) {
      updateBody.values = command.values.map((v) => ({
        _environmentId: v._environmentId,
        value: encryptSecret(v.value),
      }));
    }

    if (Object.keys(updateBody).length === 0) {
      throw new BadRequestException('At least one field must be provided to update');
    }

    updateBody._updatedBy = command.userId;

    await this.environmentVariableRepository.update(
      { _id: command.variableId, _organizationId: command.organizationId },
      { $set: updateBody }
    );

    const updated = await this.environmentVariableRepository.findById(
      { _id: command.variableId, _organizationId: command.organizationId },
      '*'
    );

    if (!updated) {
      throw new NotFoundException(`Environment variable with id ${command.variableId} not found`);
    }

    return toEnvironmentVariableResponseDto(updated);
  }
}
