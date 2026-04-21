import { Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentVariableRepository } from '@novu/dal';
import { DeleteEnvironmentVariableCommand } from './delete-environment-variable.command';

@Injectable()
export class DeleteEnvironmentVariable {
  constructor(private environmentVariableRepository: EnvironmentVariableRepository) {}

  async execute(command: DeleteEnvironmentVariableCommand): Promise<void> {
    const existing = await this.environmentVariableRepository.findOne(
      { key: command.variableKey, _organizationId: command.organizationId },
      ['_id']
    );

    if (!existing) {
      throw new NotFoundException(`Environment variable with key "${command.variableKey}" not found`);
    }

    await this.environmentVariableRepository.delete({
      _id: existing._id,
      _organizationId: command.organizationId,
    });
  }
}
