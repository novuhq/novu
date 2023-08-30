import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { CHANNELS_WITH_PRIMARY } from '@novu/shared';

import { SelectIntegrationCommand } from './select-integration.command';
import { buildIntegrationKey, CachedQuery } from '../../services/cache';
import {
  FeatureFlagCommand,
  GetIsMultiProviderConfigurationEnabled,
} from '../get-feature-flag';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../get-decrypted-integrations';

const LOG_CONTEXT = 'SelectIntegration';

@Injectable()
export class SelectIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    protected getIsMultiProviderConfigurationEnabled: GetIsMultiProviderConfigurationEnabled,
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
      await this.getIsMultiProviderConfigurationEnabled.execute(
        FeatureFlagCommand.create({
          userId: command.userId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
        })
      );

    if (!isMultiProviderConfigurationEnabled) {
      const integrations = await this.getDecryptedIntegrationsUsecase.execute(
        GetDecryptedIntegrationsCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          channelType: command.channelType,
          findOne: true,
          active: true,
          userId: command.userId,
        })
      );

      return integrations[0];
    }

    const isChannelSupportsPrimary = CHANNELS_WITH_PRIMARY.includes(
      command.channelType
    );

    let query: Partial<IntegrationEntity> & { _organizationId: string } = {
      ...(command.id ? { id: command.id } : {}),
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      channel: command.channelType,
      ...(command.providerId ? { providerId: command.providerId } : {}),
      active: true,
      ...(isChannelSupportsPrimary && {
        primary: true,
      }),
    };

    if (command.identifier) {
      query = {
        _organizationId: command.organizationId,
        channel: command.channelType,
        identifier: command.identifier,
        active: true,
      };
    }

    const integration = await this.integrationRepository.findOne(
      query,
      undefined,
      { query: { sort: { createdAt: -1 } } }
    );

    if (!integration) {
      return;
    }

    return GetDecryptedIntegrations.getDecryptedCredentials(integration);
  }
}
