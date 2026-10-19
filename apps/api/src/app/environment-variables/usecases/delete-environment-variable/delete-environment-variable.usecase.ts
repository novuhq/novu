import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentVariableRepository } from '@novu/dal';
import { DeleteEnvironmentVariableCommand } from './delete-environment-variable.command';

@Injectable()
export class DeleteEnvironmentVariable {
  constructor(private environmentVariableRepository: EnvironmentVariableRepository) {}

  async execute(command: DeleteEnvironmentVariableCommand): Promise<void> {
    const existing = await this.environmentVariableRepository.findOne(
      { key: command.variableKey, _organizationId: command.organizationId },
      ['_id', 'values']
    );

    if (!existing) {
      throw new NotFoundException(`Environment variable with key "${command.variableKey}" not found`);
    }

    if (command.restrictToUserEnvironment) {
      await this.deleteScopedEnvironmentValue(command, existing._id, existing.values);

      return;
    }

    await this.environmentVariableRepository.delete({
      _id: existing._id,
      _organizationId: command.organizationId,
    });
  }

  private async deleteScopedEnvironmentValue(
    command: DeleteEnvironmentVariableCommand,
    variableId: string,
    values: Array<{ _environmentId: string }>
  ): Promise<void> {
    const callerEnvironmentId = command.environmentId;

    if (!callerEnvironmentId) {
      throw new ForbiddenException(
        'This authentication scheme is scoped to a single environment and cannot delete a shared environment variable without an authenticated environment.'
      );
    }

    const hasCallerValue = values.some((value) => value._environmentId === callerEnvironmentId);

    if (!hasCallerValue) {
      throw new NotFoundException(
        `Environment variable with key "${command.variableKey}" has no value for the authenticated environment`
      );
    }

    await this.environmentVariableRepository.update(
      { _id: variableId, _organizationId: command.organizationId },
      { $pull: { values: { _environmentId: callerEnvironmentId } } }
    );

    // Remove the org-level record when no per-environment values remain.
    // Scoped to empty values so a concurrent sibling-env write cannot be wiped.
    await this.environmentVariableRepository.delete({
      _id: variableId,
      _organizationId: command.organizationId,
      values: { $size: 0 },
    });
  }
}
