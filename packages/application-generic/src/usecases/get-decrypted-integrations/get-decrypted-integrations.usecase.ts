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
import { FeatureFlagCommand, GetFeatureFlag } from '../get-feature-flag';

@Injectable()
export class GetDecryptedIntegrations {
  constructor(
    private integrationRepository: IntegrationRepository,
    private getNovuIntegration: GetNovuIntegration,
    private getFeatureFlag: GetFeatureFlag
  ) {}

  async execute(
    command: GetDecryptedIntegrationsCommand
  ): Promise<IntegrationEntity[]> {
    const query: Partial<IntegrationEntity> & { _organizationId: string } = {
      _organizationId: command.organizationId,
    };

    if (command.environmentId) {
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

    const isMultiProviderConfigurationEnabled =
      await this.getFeatureFlag.isMultiProviderConfigurationEnabled(
        FeatureFlagCommand.create({
          userId: command.userId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
        })
      );

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
      integrations.push(novuSmsIntegration);
    }

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
      integrations.push(novuEmailIntegration);
    }

    return integrations;
  }
}
