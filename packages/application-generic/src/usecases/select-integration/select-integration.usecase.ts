import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';

import {
  GetNovuIntegration,
  GetNovuIntegrationCommand,
} from '../get-novu-integration';
import { SelectIntegrationCommand } from './select-integration.command';
import { decryptCredentials } from '../../encryption';
import { buildIntegrationKey, CachedQuery } from '../../services';
import { FeatureFlagCommand, GetFeatureFlag } from '../get-feature-flag';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../get-decrypted-integrations';

@Injectable()
export class SelectIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    private getNovuIntegration: GetNovuIntegration,
    protected getFeatureFlag: GetFeatureFlag,
    protected getDecryptedIntegrationsUsecase: GetDecryptedIntegrations
  ) {}

  @CachedQuery({
    builder: ({ organizationId, ...command }: SelectIntegrationCommand) =>
      buildIntegrationKey().cache({
        _organizationId: organizationId,
        ...command,
      }),
  })
  async execute(
    command: SelectIntegrationCommand
  ): Promise<IntegrationEntity | undefined> {
    const isMultiProviderConfigurationEnabled =
      await this.getFeatureFlag.isMultiProviderConfigurationEnabled(
        FeatureFlagCommand.create({
          userId: command.userId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
        })
      );

    if (!isMultiProviderConfigurationEnabled) {
      return this.getDecryptedIntegrationsUsecase.execute(
        GetDecryptedIntegrationsCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          channelType: command.channelType,
          findOne: true,
          active: true,
          userId: command.userId,
        })
      )[0];
    }

    const query: Partial<IntegrationEntity> & { _organizationId: string } = {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      channel: command.channelType,
      ...(command.providerId ? { providerId: command.providerId } : {}),
      active: true,
    };

    const integration = await this.integrationRepository.findOne(
      query,
      undefined,
      { query: { sort: { createdAt: -1 } } }
    );

    if (integration) {
      integration.credentials = decryptCredentials(integration.credentials);

      return integration;
    }

    const novuIntegration = await this.getNovuIntegration.execute(
      GetNovuIntegrationCommand.create({
        channelType: command.channelType,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
      })
    );

    return novuIntegration;
  }
}
