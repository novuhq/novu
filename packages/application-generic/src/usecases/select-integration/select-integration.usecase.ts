import { Injectable } from '@nestjs/common';
import {
  IntegrationEntity,
  IntegrationRepository,
  TenantEntity,
  TenantRepository,
} from '@novu/dal';
import { CHANNELS_WITH_PRIMARY } from '@novu/shared';

import { SelectIntegrationCommand } from './select-integration.command';
import { ConditionsFilter } from '../conditions-filter';
import { CachedQuery } from '../../services/cache/interceptors/cached-query.interceptor';
import { buildIntegrationKey } from '../../services/cache/key-builders/queries';
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
      const query = this.getIntegrationQuery(command);

      const integrations = await this.integrationRepository.find(query);

      let tenant: TenantEntity | null = null;

      if (command.filterData.tenant.identifier) {
        tenant = await this.tenantRepository.findOne({
          _organizationId: command.organizationId,
          _environmentId: command.environmentId,
          identifier: command.filterData.tenant.identifier,
        });
      }

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
            variables: {
              tenant,
            },
          })
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

    const query: Partial<IntegrationEntity> & { _organizationId: string } =
      command.identifier
        ? {
            _organizationId: command.organizationId,
            channel: command.channelType,
            identifier: command.identifier,
            active: true,
          }
        : this.getIntegrationQuery(command, isChannelSupportsPrimary);

    return await this.integrationRepository.findOne(query, undefined, {
      query: { sort: { createdAt: -1 } },
    });
  }

  private getIntegrationQuery(
    command: SelectIntegrationCommand,
    isChannelSupportsPrimary = false
  ) {
    const query: Partial<IntegrationEntity> & { _organizationId: string } = {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      channel: command.channelType,
      active: true,
    };

    if (command.id) {
      query._id = command.id;
    }

    if (command.providerId) {
      query.providerId = command.providerId;
    }

    if (isChannelSupportsPrimary) {
      query.primary = true;
    }

    return query;
  }
}
