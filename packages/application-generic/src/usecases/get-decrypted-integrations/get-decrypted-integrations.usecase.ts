import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';

import { decryptCredentials } from '../../encryption';
import { GetDecryptedIntegrationsCommand } from './get-decrypted-integrations.command';
import { FeatureFlagCommand, GetFeatureFlag } from '../get-feature-flag';
import { EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';

@Injectable()
export class GetDecryptedIntegrations {
  constructor(
    private integrationRepository: IntegrationRepository,
    private getFeatureFlag: GetFeatureFlag
  ) {}

  async execute(
    command: GetDecryptedIntegrationsCommand
  ): Promise<IntegrationEntity[]> {
    const isMultiProviderConfigurationEnabled =
      await this.getFeatureFlag.isMultiProviderConfigurationEnabled(
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
        GetDecryptedIntegrations.decryptCredentials(
          integration,
          command.hideNovuCredentials
        )
      );
  }

  public static decryptCredentials(
    integration: IntegrationEntity,
    hideNovuCredentials = true
  ) {
    if (
      integration.providerId === EmailProviderIdEnum.Novu &&
      !hideNovuCredentials
    ) {
      integration.credentials = {
        apiKey: process.env.NOVU_EMAIL_INTEGRATION_API_KEY,
        from: 'no-reply@novu.co',
        senderName: 'Novu',
        ipPoolName: 'Demo',
      };

      return integration;
    }

    if (
      integration.providerId === SmsProviderIdEnum.Novu &&
      !hideNovuCredentials
    ) {
      integration.credentials = {
        accountSid: process.env.NOVU_SMS_INTEGRATION_ACCOUNT_SID,
        token: process.env.NOVU_SMS_INTEGRATION_TOKEN,
        from: process.env.NOVU_SMS_INTEGRATION_SENDER,
      };

      return integration;
    }

    integration.credentials = decryptCredentials(integration.credentials);

    return integration;
  }
}
