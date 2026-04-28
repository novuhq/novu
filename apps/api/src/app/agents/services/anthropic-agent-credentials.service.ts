import { Injectable, NotFoundException } from '@nestjs/common';
import {
  decryptEnvironmentVariableValue,
  encryptSecret,
  PinoLogger,
  ResourceValidatorService,
} from '@novu/application-generic';
import { EnvironmentVariableRepository } from '@novu/dal';
import { EnvironmentVariableType } from '@novu/shared';
import { ANTHROPIC_API_KEY_ENV_VAR } from '../dtos/agent-runtime.dto';

@Injectable()
export class AnthropicAgentCredentialsService {
  constructor(
    private readonly environmentVariableRepository: EnvironmentVariableRepository,
    private readonly resourceValidatorService: ResourceValidatorService,
    private readonly logger: PinoLogger
  ) {}

  async isConfigured(organizationId: string, environmentId: string): Promise<boolean> {
    const variable = await this.environmentVariableRepository.findOne(
      { _organizationId: organizationId, key: ANTHROPIC_API_KEY_ENV_VAR },
      ['values']
    );

    return Boolean(variable?.values?.some((value) => value._environmentId === environmentId && value.value));
  }

  async getApiKey(organizationId: string, environmentId: string): Promise<string> {
    const variable = await this.environmentVariableRepository.findOne(
      { _organizationId: organizationId, key: ANTHROPIC_API_KEY_ENV_VAR },
      ['values']
    );
    const value = variable?.values?.find((item) => item._environmentId === environmentId)?.value;

    if (!value) {
      throw new NotFoundException('Anthropic API key is not configured for this environment.');
    }

    return decryptEnvironmentVariableValue(value);
  }

  async upsertApiKey(params: {
    organizationId: string;
    environmentId: string;
    userId: string;
    apiKey: string;
  }): Promise<void> {
    const existing = await this.environmentVariableRepository.findOne(
      { _organizationId: params.organizationId, key: ANTHROPIC_API_KEY_ENV_VAR },
      '*'
    );
    const encrypted = encryptSecret(params.apiKey);

    if (!existing) {
      await this.resourceValidatorService.validateEnvironmentVariablesLimit(params.organizationId);
      await this.environmentVariableRepository.create({
        _organizationId: params.organizationId,
        key: ANTHROPIC_API_KEY_ENV_VAR,
        type: EnvironmentVariableType.STRING,
        isSecret: true,
        values: [{ _environmentId: params.environmentId, value: encrypted }],
        _updatedBy: params.userId,
      });

      return;
    }

    const updateExisting = await this.environmentVariableRepository.updateOne(
      { _organizationId: params.organizationId, _id: existing._id, 'values._environmentId': params.environmentId },
      {
        $set: {
          'values.$.value': encrypted,
          isSecret: true,
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
          $set: { isSecret: true, type: EnvironmentVariableType.STRING, _updatedBy: params.userId },
          $push: { values: { _environmentId: params.environmentId, value: encrypted } },
        }
      );
    }

    this.logger.debug(`Updated ${ANTHROPIC_API_KEY_ENV_VAR} for environment ${params.environmentId}`);
  }
}
