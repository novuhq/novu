import { Injectable } from '@nestjs/common';
import {
  ChannelTypeEnum,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';

import { decryptCredentials } from '../../encryption';
import { GetDecryptedIntegrationsCommand } from './get-decrypted-integrations.command';
import {
  GetNovuIntegration,
  GetNovuIntegrationCommand,
} from '../get-novu-integration';
import {
  FeatureFlagCommand,
  GetIsMultiProviderConfigurationEnabled,
} from '../get-feature-flag';

@Injectable()
export class GetDecryptedIntegrations {
  constructor(
    private integrationRepository: IntegrationRepository,
    private getNovuIntegration: GetNovuIntegration,
    private getIsMultiProviderConfigurationEnabled: GetIsMultiProviderConfigurationEnabled
  ) {}

  private async getNovuIntegrations(command: GetDecryptedIntegrationsCommand) {
    let novuIntegrations: IntegrationEntity[] = [];
    const novuEmailIntegration = await this.getNovuIntegration.execute(
      GetNovuIntegrationCommand.create({
        channelType: ChannelTypeEnum.EMAIL,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        ignoreActiveCount: true,
      })
    );

    if (novuEmailIntegration) {
      novuIntegrations.push(novuEmailIntegration);
    }

    const novuSmsIntegration = await this.getNovuIntegration.execute(
      GetNovuIntegrationCommand.create({
        channelType: ChannelTypeEnum.SMS,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        ignoreActiveCount: true,
      })
    );

    if (novuSmsIntegration) {
      novuIntegrations.push(novuSmsIntegration);
    }

    if (command.active) {
      novuIntegrations = novuIntegrations.filter((el) => el.active);
    }

    return novuIntegrations;
  }

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

    const integrations = foundIntegrations
      .filter((integration) => integration)
      .map((integration: IntegrationEntity) => {
        integration.credentials = decryptCredentials(integration.credentials);

        return integration;
      });

    if (!isMultiProviderConfigurationEnabled) {
      if (command.channelType === undefined || integrations.length > 0) {
        return integrations;
      }

      const novuIntegration = await this.getNovuIntegration.execute(
        GetNovuIntegrationCommand.create({
          channelType: command.channelType,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
        })
      );

      return novuIntegration ? [novuIntegration] : [];
    }

    const novuIntegrations = await this.getNovuIntegrations(command);

    return [...integrations, ...novuIntegrations];
  }
}
