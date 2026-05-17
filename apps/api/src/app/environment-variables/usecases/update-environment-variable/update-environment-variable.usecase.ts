import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { encryptSecret } from '@novu/application-generic';
import { EnvironmentVariableRepository } from '@novu/dal';
import { SECRET_MASK } from '@novu/shared';
import { EnvironmentVariableResponseDto } from '../../dtos/environment-variable-response.dto';
import { toEnvironmentVariableResponseDto } from '../get-environment-variables/get-environment-variables.usecase';
import { UpdateEnvironmentVariableCommand } from './update-environment-variable.command';

@Injectable()
export class UpdateEnvironmentVariable {
  constructor(private environmentVariableRepository: EnvironmentVariableRepository) {}

  async execute(command: UpdateEnvironmentVariableCommand): Promise<EnvironmentVariableResponseDto> {
    const existing = await this.environmentVariableRepository.findOne(
      { key: command.variableKey, _organizationId: command.organizationId },
      '*'
    );

    if (!existing) {
      throw new NotFoundException(`Environment variable with key "${command.variableKey}" not found`);
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
      // Defense in depth: never let the public secret mask string be persisted as an
      // actual variable value. The dashboard returns mask strings on reads, so accepting
      // them on writes would silently overwrite real secrets.
      const maskedValue = command.values.find((v) => v.value === SECRET_MASK);
      if (maskedValue) {
        throw new BadRequestException(
          'Submitted value matches the secret mask placeholder; provide the real value or omit the entry to keep the existing one.'
        );
      }

      // PATCH semantics: merge values per `_environmentId` instead of replacing the
      // entire array. Envs not present in the request keep their existing values.
      const incomingByEnv = new Map(command.values.map((v) => [v._environmentId, v.value]));
      const mergedEnvIds = new Set<string>();

      const mergedValues = existing.values.map((v) => {
        if (incomingByEnv.has(v._environmentId)) {
          mergedEnvIds.add(v._environmentId);

          return {
            _environmentId: v._environmentId,
            value: encryptSecret(incomingByEnv.get(v._environmentId) as string),
          };
        }

        return { _environmentId: v._environmentId, value: v.value };
      });

      for (const [_environmentId, value] of incomingByEnv) {
        if (!mergedEnvIds.has(_environmentId)) {
          mergedValues.push({ _environmentId, value: encryptSecret(value) });
        }
      }

      updateBody.values = mergedValues;
    }

    if (Object.keys(updateBody).length === 0) {
      throw new BadRequestException('At least one field must be provided to update');
    }

    updateBody._updatedBy = command.userId;

    await this.environmentVariableRepository.update(
      { _id: existing._id, _organizationId: command.organizationId },
      { $set: updateBody }
    );

    const updatedKey = command.key ?? command.variableKey;
    const updated = await this.environmentVariableRepository.findOne(
      { key: updatedKey, _organizationId: command.organizationId },
      '*'
    );

    if (!updated) {
      throw new NotFoundException(`Environment variable with key "${updatedKey}" not found`);
    }

    return toEnvironmentVariableResponseDto(updated);
  }
}
