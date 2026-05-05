import { Injectable } from '@nestjs/common';
import { PinoLogger, ResourceValidatorService } from '@novu/application-generic';
import { EnvironmentVariableRepository } from '@novu/dal';
import { EnvironmentVariableType } from '@novu/shared';

export const ANTHROPIC_ENVIRONMENT_ID_ENV_VAR = 'NOVU_AGENT_ANTHROPIC_ENVIRONMENT_ID' as const;

@Injectable()
export class AnthropicEnvironmentRegistryService {
  constructor(
    private readonly environmentVariableRepository: EnvironmentVariableRepository,
    private readonly resourceValidatorService: ResourceValidatorService,
    private readonly logger: PinoLogger
  ) {}

  async get(organizationId: string, environmentId: string): Promise<string | undefined> {
    const variable = await this.environmentVariableRepository.findOne(
      { _organizationId: organizationId, key: ANTHROPIC_ENVIRONMENT_ID_ENV_VAR },
      ['values']
    );
    const value = variable?.values?.find((item) => item._environmentId === environmentId)?.value;

    return value || undefined;
  }

  async set(params: {
    organizationId: string;
    environmentId: string;
    userId: string;
    anthropicEnvironmentId: string;
  }): Promise<void> {
    const existing = await this.environmentVariableRepository.findOne(
      { _organizationId: params.organizationId, key: ANTHROPIC_ENVIRONMENT_ID_ENV_VAR },
      '*'
    );

    if (!existing) {
      await this.resourceValidatorService.validateEnvironmentVariablesLimit(params.organizationId);
      await this.environmentVariableRepository.create({
        _organizationId: params.organizationId,
        key: ANTHROPIC_ENVIRONMENT_ID_ENV_VAR,
        type: EnvironmentVariableType.STRING,
        isSecret: false,
        values: [{ _environmentId: params.environmentId, value: params.anthropicEnvironmentId }],
        _updatedBy: params.userId,
      });

      return;
    }

    const updateExisting = await this.environmentVariableRepository.updateOne(
      {
        _organizationId: params.organizationId,
        _id: existing._id,
        'values._environmentId': params.environmentId,
      },
      {
        $set: {
          'values.$.value': params.anthropicEnvironmentId,
          isSecret: false,
          type: EnvironmentVariableType.STRING,
          _updatedBy: params.userId,
        },
      }
    );

    if (updateExisting.matched === 0) {
      await this.environmentVariableRepository.updateOne(
        {
          _organizationId: params.organizationId,
          _id: existing._id,
          'values._environmentId': { $ne: params.environmentId },
        },
        {
          $set: { isSecret: false, type: EnvironmentVariableType.STRING, _updatedBy: params.userId },
          $push: { values: { _environmentId: params.environmentId, value: params.anthropicEnvironmentId } },
        }
      );
    }

    this.logger.debug(`Cached ${ANTHROPIC_ENVIRONMENT_ID_ENV_VAR} for environment ${params.environmentId}`);
  }
}
