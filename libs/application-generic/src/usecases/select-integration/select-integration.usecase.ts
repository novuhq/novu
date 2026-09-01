import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationQuery, IntegrationRepository, TenantEntity, TenantRepository } from '@novu/dal';
import { CHANNELS_WITH_PRIMARY, FeatureFlagsKeysEnum } from '@novu/shared';
import { AdditionalOperation, RulesLogic } from 'json-logic-js';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { FeatureFlagsService } from '../../services/feature-flags';
import { evaluateRules } from '../../services/query-parser';
import {
  getIntegrationRulesIssues,
  hasIntegrationRules,
  hasLegacyIntegrationConditions,
} from '../../utils/integration-conditions';
import { ConditionsFilter, ConditionsFilterCommand } from '../conditions-filter';
import { GetDecryptedIntegrations } from '../get-decrypted-integrations';
import { NormalizeVariables, NormalizeVariablesCommand } from '../normalize-variables';
import { SelectIntegrationCommand } from './select-integration.command';

export enum IntegrationSelectionSkipReasonEnum {
  /** No integration matched the query at all — deleted, inactive, or never configured. */
  NOT_FOUND = 'not_found',
  /** The integration exists and is active, but its conditions evaluated to false for this send. */
  RULES_NOT_MATCHED = 'rules_not_matched',
  /** The integration's conditions reference unsupported fields or operators and cannot be trusted. */
  RULES_INVALID = 'rules_invalid',
}

export type IntegrationSelectionResult = {
  integration?: IntegrationEntity;
  skipReason?: IntegrationSelectionSkipReasonEnum;
};

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
    const { integration } = await this.executeWithReason(command);

    return integration;
  }

  /**
   * Same selection as {@link execute}, but reports why nothing was selected so callers can tell a
   * missing integration apart from one deliberately withheld by its conditions.
   */
  async executeWithReason(command: SelectIntegrationCommand): Promise<IntegrationSelectionResult> {
    const isCrossEnvironmentIntegrationEnabled = await this.isCrossEnvironmentIntegrationEnabled(command);

    let integration: IntegrationEntity | null = await this.getPrimaryIntegration(
      command,
      isCrossEnvironmentIntegrationEnabled
    );
    let skipReason: IntegrationSelectionSkipReasonEnum | undefined;

    /*
     * `rules` gate delivery, so an integration reached directly — by id, identifier, or as the
     * channel primary — is still discarded when its own rules do not match. Channels that resolve
     * their integration from subscriber channels or endpoints (chat, push) never enter the scan
     * below, and would otherwise deliver regardless of the conditions configured on them.
     */
    if (!command.ignoreRules && integration) {
      const rulesSkipReason = this.getIntegrationRulesSkipReason(command, integration);

      if (rulesSkipReason) {
        integration = null;
        skipReason = rulesSkipReason;
      }
    }

    if (!command.identifier) {
      const integrations = await this.integrationRepository.find(
        this.getConditionedIntegrationsQuery(command, isCrossEnvironmentIntegrationEnabled),
        '',
        { sort: { priority: -1, createdAt: -1 } }
      );

      if (integrations.length > 0) {
        const tenant = await this.resolveTenant(command);

        for (const currentIntegration of integrations) {
          const passed = await this.integrationMatchesConditions(command, currentIntegration, tenant);

          if (passed) {
            integration = currentIntegration;
            skipReason = undefined;
            break;
          }
        }
      }
    }

    if (!integration) {
      return { skipReason: skipReason ?? IntegrationSelectionSkipReasonEnum.NOT_FOUND };
    }

    return { integration: GetDecryptedIntegrations.getDecryptedCredentials(integration) };
  }

  private async resolveTenant(command: SelectIntegrationCommand): Promise<TenantEntity | null> {
    if (!command.filterData.tenant) {
      return null;
    }

    const commandTenantIdentifier =
      typeof command.filterData.tenant === 'string' ? command.filterData.tenant : command.filterData.tenant.identifier;

    if (!commandTenantIdentifier) {
      return null;
    }

    return await this.tenantRepository.findOne({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      identifier: commandTenantIdentifier,
    });
  }

  /** Returns why the integration's rules withhold it, or `undefined` when it may be used. */
  private getIntegrationRulesSkipReason(
    command: SelectIntegrationCommand,
    integration: IntegrationEntity
  ): IntegrationSelectionSkipReasonEnum | undefined {
    if (!hasIntegrationRules(integration.rules)) {
      return undefined;
    }

    return this.evaluateIntegrationRules(command, integration.rules);
  }

  private evaluateIntegrationRules(
    command: SelectIntegrationCommand,
    rules: Record<string, unknown>
  ): IntegrationSelectionSkipReasonEnum | undefined {
    if (getIntegrationRulesIssues(rules).length > 0) {
      return IntegrationSelectionSkipReasonEnum.RULES_INVALID;
    }

    const { result } = evaluateRules(
      rules as RulesLogic<AdditionalOperation>,
      {
        subscriber: command.filterData.subscriber,
        context: command.filterData.context,
      },
      true
    );

    return result ? undefined : IntegrationSelectionSkipReasonEnum.RULES_NOT_MATCHED;
  }

  private async integrationMatchesConditions(
    command: SelectIntegrationCommand,
    currentIntegration: IntegrationEntity,
    tenant: TenantEntity | null
  ): Promise<boolean> {
    if (hasIntegrationRules(currentIntegration.rules)) {
      return this.evaluateIntegrationRules(command, currentIntegration.rules) === undefined;
    }

    if (!hasLegacyIntegrationConditions(currentIntegration.conditions) || !command.userId) {
      return false;
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

    return passed;
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

  private getConditionedIntegrationsQuery(
    command: SelectIntegrationCommand,
    isCrossEnvironmentIntegrationEnabled: boolean
  ): IntegrationQuery {
    return {
      ...this.getIntegrationQuery(command, isCrossEnvironmentIntegrationEnabled),
      $or: [{ rules: { $type: 'object' } }, { 'conditions.0': { $exists: true } }],
    };
  }
}
