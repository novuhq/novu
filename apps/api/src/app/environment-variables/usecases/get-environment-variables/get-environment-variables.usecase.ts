import { Injectable } from '@nestjs/common';
import { decryptEnvironmentVariableValue } from '@novu/application-generic';
import { EnforceOrgId, EnvironmentVariableEntity, EnvironmentVariableRepository, FilterQuery } from '@novu/dal';
import { EnvironmentVariableType } from '@novu/shared';
import { EnvironmentVariableResponseDto, SECRET_MASK } from '../../dtos/environment-variable-response.dto';
import { GetEnvironmentVariablesCommand } from './get-environment-variables.command';

@Injectable()
export class GetEnvironmentVariables {
  constructor(private environmentVariableRepository: EnvironmentVariableRepository) {}

  async execute(command: GetEnvironmentVariablesCommand): Promise<EnvironmentVariableResponseDto[]> {
    const query: FilterQuery<EnvironmentVariableEntity> & EnforceOrgId = {
      _organizationId: command.organizationId,
    };

    if (command.search) {
      const escapedSearch = command.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      query.key = { $regex: escapedSearch, $options: 'i' };
    }

    const variables = await this.environmentVariableRepository.find(query, '*', { sort: { createdAt: -1 } });

    return variables.map((variable) => toEnvironmentVariableResponseDto(variable));
  }
}

export function toEnvironmentVariableResponseDto(variable: EnvironmentVariableEntity): EnvironmentVariableResponseDto {
  return {
    _id: variable._id,
    _organizationId: variable._organizationId,
    key: variable.key,
    type: variable.type ?? EnvironmentVariableType.STRING,
    isSecret: variable.isSecret,
    values: variable.values.map((v) => ({
      _environmentId: v._environmentId,
      value: variable.isSecret ? SECRET_MASK : decryptEnvironmentVariableValue(v.value),
    })),
    createdAt: variable.createdAt,
    updatedAt: variable.updatedAt,
  };
}
