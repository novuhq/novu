import { Injectable } from '@nestjs/common';
import {
  IntegrationEntity,
  IntegrationRepository,
  TenantEntity,
  TenantRepository,
} from '@novu/dal';
import { CHANNELS_WITH_PRIMARY } from '@novu/shared';

import { SelectIntegrationCommand } from './select-integration.command';
import { ConditionsFilter } from '../conditions-filter/conditions-filter.usecase';
import { buildIntegrationKey, CachedQuery } from '../../services/cache';
import {
  FeatureFlagCommand,
  GetIsMultiProviderConfigurationEnabled,
} from '../get-feature-flag';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../get-decrypted-integrations';
import { ConditionsFilterCommand } from '../conditions-filter';

const LOG_CONTEXT = 'SelectIntegration';

@Injectable()
export class SelectIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    protected getDecryptedIntegrationsUsecase: GetDecryptedIntegrations,
    protected conditionsFilter: ConditionsFilter,
    private tenantRepository: TenantRepository,
    protected getIsMultiProviderConfigurationEnabled: GetIsMultiProviderConfigurationEnabled
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

    let integration: IntegrationEntity | null =
      await this.getPrimaryIntegration(command);

    if (!command.identifier && command.filterData.tenant) {
      const query: Partial<IntegrationEntity> & { _organizationId: string } = {
        ...(command.id ? { id: command.id } : {}),
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
        channel: command.channelType,
        ...(command.providerId ? { providerId: command.providerId } : {}),
        active: true,
      };

      let tenant: TenantEntity | null = null;

      if (command.filterData.tenant.identifier) {
        tenant = await this.tenantRepository.findOne({
          identifier: command.filterData.tenant.identifier,
        });
      }

      const integrations = await this.integrationRepository.find(query);

      for (const currentIntegration of integrations) {
        if (
          !currentIntegration.conditions ||
          currentIntegration.conditions.length === 0
        ) {
          continue;
        }

        const { passed } = await this.conditionsFilter.filter(
          ConditionsFilterCommand.create({
            filters: currentIntegration.conditions,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            userId: command.userId,
          }),
          {
            tenant,
          }
        );
        if (passed) {
          integration = currentIntegration;
          break;
        }
      }
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
      ...(command.id ? { _id: command.id } : {}),
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
