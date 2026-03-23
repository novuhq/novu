import { ConflictException, Injectable } from '@nestjs/common';
import { encryptSecret, ResourceValidatorService } from '@novu/application-generic';
import { EnvironmentVariableRepository, ErrorCodesEnum } from '@novu/dal';
import { EnvironmentVariableType } from '@novu/shared';
import { EnvironmentVariableResponseDto } from '../../dtos/environment-variable-response.dto';
import { toEnvironmentVariableResponseDto } from '../get-environment-variables/get-environment-variables.usecase';
import { CreateEnvironmentVariableCommand } from './create-environment-variable.command';

@Injectable()
export class CreateEnvironmentVariable {
  constructor(
    private environmentVariableRepository: EnvironmentVariableRepository,
    private resourceValidatorService: ResourceValidatorService
  ) {}

  async execute(command: CreateEnvironmentVariableCommand): Promise<EnvironmentVariableResponseDto> {
    await this.resourceValidatorService.validateEnvironmentVariablesLimit(command.organizationId);

    const existing = await this.environmentVariableRepository.findOne(
      { _organizationId: command.organizationId, key: command.key },
      ['_id']
    );

    if (existing) {
      throw new ConflictException(`Environment variable with key "${command.key}" already exists`);
    }

    const values = (command.values ?? []).map((v) => ({
      _environmentId: v._environmentId,
      value: encryptSecret(v.value),
    }));

    try {
      const created = await this.environmentVariableRepository.create({
        _organizationId: command.organizationId,
        key: command.key,
        type: command.type ?? EnvironmentVariableType.STRING,
        isSecret: command.isSecret ?? false,
        values,
        _updatedBy: command.userId,
      });

      return toEnvironmentVariableResponseDto(created);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: number }).code === ErrorCodesEnum.DUPLICATE_KEY
      ) {
        throw new ConflictException(`Environment variable with key "${command.key}" already exists`);
      }

      throw error;
    }
  }
}
