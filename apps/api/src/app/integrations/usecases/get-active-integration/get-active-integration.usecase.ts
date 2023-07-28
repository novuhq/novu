import { Injectable } from '@nestjs/common';

import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
  FeatureFlagCommand,
  GetFeatureFlag,
} from '@novu/application-generic';

import { GetActiveIntegrationsCommand } from './get-active-integration.command';
import { GetActiveIntegrationResponseDto } from '../../dtos/get-active-integration-response.dto';

@Injectable()
export class GetActiveIntegrations {
  constructor(
    private getDecryptedIntegrationsUsecase: GetDecryptedIntegrations,
    private getFeatureFlag: GetFeatureFlag
  ) {}

  async execute(command: GetActiveIntegrationsCommand): Promise<GetActiveIntegrationResponseDto[]> {
    const isMultiProviderConfigurationEnabled = await this.getFeatureFlag.isMultiProviderConfigurationEnabled(
      FeatureFlagCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
      })
    );

    const activeIntegrations = await this.getDecryptedIntegrationsUsecase.execute(
      GetDecryptedIntegrationsCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        active: true,
      })
    );

    if (!activeIntegrations.length) {
      return [];
    }

    if (!isMultiProviderConfigurationEnabled) {
      return activeIntegrations;
    }

    return activeIntegrations.map((integration) => {
      return { ...integration, selected: integration.primary };
    });
  }
}

export function notNullish<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}
