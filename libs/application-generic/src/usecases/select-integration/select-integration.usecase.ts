import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository, TenantEntity, TenantRepository } from '@novu/dal';
import { CHANNELS_WITH_PRIMARY, FeatureFlagsKeysEnum } from '@novu/shared';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { FeatureFlagsService } from '../../services/feature-flags';
import { ConditionsFilter, ConditionsFilterCommand } from '../conditions-filter';
import { GetDecryptedIntegrations } from '../get-decrypted-integrations';
import { NormalizeVariables, NormalizeVariablesCommand } from '../normalize-variables';
import { SelectIntegrationCommand } from './select-integration.command';

@Injectable()
export class SelectIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    protected conditionsFilter: ConditionsFilter,
    private tenantRepository: TenantRepository,
    private normalizeVariablesUsecase: NormalizeVariables,
    private featureFlagsService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(command: SelectIntegrationCommand): Promise<IntegrationEntity | undefined> {
    const isCrossEnvironmentIntegrationEnabled = await this.isCrossEnvironmentIntegrationEnabled(command);

    let integration: IntegrationEntity | null = await this.getPrimaryIntegration(
      command,
      isCrossEnvironmentIntegrationEnabled
    );

    if (!command.identifier && command.filterData.tenant && command.userId) {
      const query = this.getIntegrationQuery(command, isCrossEnvironmentIntegrationEnabled);

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
        if (!currentIntegration.conditions || currentIntegration.conditions.length === 0) {
          continue;
        }

        const variables = await this.normalizeVariablesUsecase.execute(
          NormalizeVariablesCommand.create({
            filters: currentIntegration.conditions || [],
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            userId: command.userId,
            variables: {
              tenant,
            },
          })
        );

        const { passed } = await this.conditionsFilter.filter(
          ConditionsFilterCommand.create({
            filters: currentIntegration.conditions,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            userId: command.userId,
            variables,
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

  @Instrument()
  private async getPrimaryIntegration(
    command: SelectIntegrationCommand,
    isCrossEnvironmentIntegrationEnabled: boolean
  ): Promise<IntegrationEntity | null> {
    const isChannelSupportsPrimary = CHANNELS_WITH_PRIMARY.includes(command.channelType);

    const query: Partial<IntegrationEntity> & { _organizationId: string } = command.identifier
      ? {
          _organizationId: command.organizationId,
          ...(!isCrossEnvironmentIntegrationEnabled && {
            _environmentId: command.environmentId,
          }),
          channel: command.channelType,
          identifier: command.identifier,
          active: true,
        }
      : this.getIntegrationQuery(command, isCrossEnvironmentIntegrationEnabled, isChannelSupportsPrimary);

    return await this.integrationRepository.findOne(query, undefined, {
      query: { sort: { createdAt: -1 } },
    });
  }

  private async isCrossEnvironmentIntegrationEnabled(command: SelectIntegrationCommand): Promise<boolean> {
    return this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CROSS_ENVIRONMENT_INTEGRATION_ENABLED,
      defaultValue: false,
      organization: { _id: String(command.organizationId) },
      environment: { _id: String(command.environmentId) },
    });
  }

  private getIntegrationQuery(
    command: SelectIntegrationCommand,
    isCrossEnvironmentIntegrationEnabled: boolean,
    isChannelSupportsPrimary = false
  ) {
    const query: Partial<IntegrationEntity> & { _organizationId: string } = {
      _organizationId: command.organizationId,
      ...(!isCrossEnvironmentIntegrationEnabled && {
        _environmentId: command.environmentId,
      }),
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
