import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';

import { decryptCredentials } from '../../encryption';
import { GetDecryptedIntegrationsCommand } from './get-decrypted-integrations.command';
import {
  FeatureFlagCommand,
  GetIsMultiProviderConfigurationEnabled,
} from '../get-feature-flag';

@Injectable()
export class GetDecryptedIntegrations {
  constructor(
    private integrationRepository: IntegrationRepository,
    private getIsMultiProviderConfigurationEnabled: GetIsMultiProviderConfigurationEnabled
  ) {}

  async execute(
    command: GetDecryptedIntegrationsCommand
  ): Promise<IntegrationEntity[]> {
    const isMultiProviderConfigurationEnabled =
      await this.getIsMultiProviderConfigurationEnabled.execute(
        FeatureFlagCommand.create({
          userId: command.userId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
        })
      );

    const query: Partial<IntegrationEntity> & { _organizationId: string } = {
      _organizationId: command.organizationId,
    };

    if (command.environmentId && !isMultiProviderConfigurationEnabled) {
      query._environmentId = command.environmentId;
    }

    if (command.active) {
      query.active = command.active;
    }

    if (command.channelType) {
      query.channel = command.channelType;
    }

    if (command.providerId) {
      query.providerId = command.providerId;
    }

    const foundIntegrations = command.findOne
      ? [await this.integrationRepository.findOne(query)]
      : await this.integrationRepository.find(query);

    return foundIntegrations
      .filter((integration) => integration)
      .map((integration: IntegrationEntity) =>
        GetDecryptedIntegrations.getDecryptedCredentials(integration)
      );
  }

  public static getDecryptedCredentials(integration: IntegrationEntity) {
    integration.credentials = decryptCredentials(integration.credentials);

    return integration;
  }
}
