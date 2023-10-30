import { Injectable } from '@nestjs/common';
import {
  IntegrationEntity,
  IntegrationRepository,
  TenantEntity,
  TenantRepository,
} from '@novu/dal';
import { CHANNELS_WITH_PRIMARY } from '@novu/shared';

import { GetDecryptedIntegrations } from '../get-decrypted-integrations';
import { SelectIntegrationCommand } from './select-integration.command';

import { buildIntegrationKey, CachedQuery } from '../../services/cache';
import { FilterConditionsService } from '../../services/filters/filter-conditions.service';

const LOG_CONTEXT = 'SelectIntegration';

@Injectable()
export class SelectIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    protected getDecryptedIntegrationsUsecase: GetDecryptedIntegrations,
    private filterConditions: FilterConditionsService,
    private tenantRepository: TenantRepository
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
      const commandTenantIdentifier =
        typeof command.filterData.tenant === 'string'
          ? command.filterData.tenant
          : command.filterData.tenant.identifier;
      if (commandTenantIdentifier) {
        tenant = await this.tenantRepository.findOne({
          _organizationId: command.organizationId,
          _environmentId: command.environmentId,
          identifier: commandTenantIdentifier,
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

        const { passed } = await this.filterConditions.filter(
          currentIntegration.conditions,
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
