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
import { GetDecryptedIntegrations } from '../get-decrypted-integrations';
import { ConditionsFilterCommand } from '../conditions-filter';

const LOG_CONTEXT = 'SelectIntegration';

@Injectable()
export class SelectIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    protected getDecryptedIntegrationsUsecase: GetDecryptedIntegrations,
    protected conditionsFilter: ConditionsFilter,
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
      const query = this.getIntegrationQuery(command);

      const integrations = await this.integrationRepository.find(query);

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
