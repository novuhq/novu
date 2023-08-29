import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { CHANNELS_WITH_PRIMARY } from '@novu/shared';

import { SelectIntegrationCommand } from './select-integration.command';
import { buildIntegrationKey, CachedQuery } from '../../services';
import { FeatureFlagCommand, GetFeatureFlag } from '../get-feature-flag';
import { ConditionsFilter } from '../conditions-filter/conditions-filter.usecase';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../get-decrypted-integrations';
import { ConditionsFilterCommand } from '../conditions-filter';

@Injectable()
export class SelectIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    protected getFeatureFlag: GetFeatureFlag,
    protected getDecryptedIntegrationsUsecase: GetDecryptedIntegrations,
    protected conditionsFilter: ConditionsFilter
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

    let integration: IntegrationEntity | null = null;

    if (command.filterData.tenant) {
      const query: Partial<IntegrationEntity> & { _organizationId: string } = {
        ...(command.id ? { id: command.id } : {}),
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
        channel: command.channelType,
        ...(command.providerId ? { providerId: command.providerId } : {}),
        active: true,
      };

      const integrations = await this.integrationRepository.find(query);

      for (const currentIntegration of integrations) {
        const { passed } = await this.conditionsFilter.filter(
          ConditionsFilterCommand.create({
            filters: currentIntegration.conditions,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            userId: command.userId,
          }),
          command.filterData
        );
        if (passed) {
          integration = currentIntegration;
          break;
        }
      }
    }

    if (!integration) {
      integration = await this.getPrimaryIntegration(command);
    }

    if (!integration) {
      return;
    }

    return GetDecryptedIntegrations.getDecryptedCredentials(integration);
  }

  private async getPrimaryIntegration(
    command: SelectIntegrationCommand
  ): Promise<IntegrationEntity | null> {
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

    return await this.integrationRepository.findOne(query, undefined, {
      query: { sort: { createdAt: -1 } },
    });
  }
}
