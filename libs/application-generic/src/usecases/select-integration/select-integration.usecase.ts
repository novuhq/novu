import { Injectable, Optional } from '@nestjs/common';
import { IntegrationEntity, IntegrationQuery, IntegrationRepository, TenantEntity, TenantRepository } from '@novu/dal';
import { CHANNELS_WITH_PRIMARY, EmailProviderIdEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { FeatureFlagsService } from '../../services/feature-flags';
import { InMemoryLRUCacheService, InMemoryLRUCacheStore } from '../../services/in-memory-lru-cache';
import {
  evaluateIntegrationRules,
  hasIntegrationRules,
  hasLegacyIntegrationConditions,
} from '../../utils/integration-conditions';
import { ConditionsFilter, ConditionsFilterCommand } from '../conditions-filter';
import { GetDecryptedIntegrations } from '../get-decrypted-integrations';
import { NormalizeVariables, NormalizeVariablesCommand } from '../normalize-variables';
import { SelectIntegrationCommand } from './select-integration.command';

export type MatchedIntegrationConditions =
  | { type: 'rules'; value: IntegrationEntity['rules'] }
  | { type: 'legacy'; value: IntegrationEntity['conditions'] };

type SelectionCandidates = {
  primary: IntegrationEntity | null;
  conditioned: IntegrationEntity[];
};

/** In-memory twin of the `$or: [{ rules: { $type: 'object' } }, { 'conditions.0': { $exists: true } }]` query. */
function hasSelectionConditions(integration: IntegrationEntity): boolean {
  const { rules, conditions } = integration;
  const hasRulesObject = typeof rules === 'object' && rules !== null && !Array.isArray(rules);

  return hasRulesObject || (Array.isArray(conditions) && conditions.length > 0);
}

/** In-memory twin of `sort: { priority: -1, createdAt: -1 }`; a missing priority sorts last. */
function byPriorityThenNewest(a: IntegrationEntity, b: IntegrationEntity): number {
  const priorityDiff = (b.priority ?? Number.NEGATIVE_INFINITY) - (a.priority ?? Number.NEGATIVE_INFINITY);
  if (priorityDiff !== 0 && !Number.isNaN(priorityDiff)) {
    return priorityDiff;
  }

  return createdAtTime(b) - createdAtTime(a);
}

/** `createdAt` comes from the schema timestamps, so it is not on the entity type. */
function createdAtTime(integration: IntegrationEntity): number {
  const { createdAt } = integration as IntegrationEntity & { createdAt?: string | Date };
  const time = createdAt ? new Date(createdAt).getTime() : 0;

  return Number.isNaN(time) ? 0 : time;
}

export interface IntegrationSelectionResult {
  integration: IntegrationEntity;
  matchedConditions?: MatchedIntegrationConditions;
}

@Injectable()
export class SelectIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    protected conditionsFilter: ConditionsFilter,
    private tenantRepository: TenantRepository,
    private normalizeVariablesUsecase: NormalizeVariables,
    private featureFlagsService: FeatureFlagsService,
    @Optional() private inMemoryLRUCacheService?: InMemoryLRUCacheService
  ) {}

  @InstrumentUsecase()
  async execute(command: SelectIntegrationCommand): Promise<IntegrationSelectionResult | undefined> {
    const isCrossEnvironmentIntegrationEnabled = await this.isCrossEnvironmentIntegrationEnabled(command);

    const candidates =
      command.useCache && this.inMemoryLRUCacheService
        ? await this.getCandidatesFromCachedIntegrations(command, isCrossEnvironmentIntegrationEnabled)
        : await this.getCandidatesFromDatabase(command, isCrossEnvironmentIntegrationEnabled);

    let integration: IntegrationEntity | null = candidates.primary;
    let matchedConditions: MatchedIntegrationConditions | undefined;

    if (!command.identifier) {
      const integrations = candidates.conditioned;

      const selectable = integrations.filter((currentIntegration) => !this.isHiddenFromWorkflows(currentIntegration));

      if (selectable.length > 0) {
        const tenant = await this.resolveTenant(command);

        for (const currentIntegration of selectable) {
          const passed = await this.integrationMatchesConditions(command, currentIntegration, tenant);

          if (passed) {
            integration = currentIntegration;
            matchedConditions = hasIntegrationRules(currentIntegration.rules)
              ? { type: 'rules', value: currentIntegration.rules }
              : { type: 'legacy', value: currentIntegration.conditions };
            break;
          }
        }
      }
    }

    if (!integration) {
      return;
    }

    // Decrypt a copy: a cached entity is shared across jobs and must keep its encrypted credentials.
    const decryptedIntegration = GetDecryptedIntegrations.getDecryptedCredentials({ ...integration });

    return {
      integration: decryptedIntegration,
      ...(matchedConditions && { matchedConditions }),
    };
  }

  private async getCandidatesFromDatabase(
    command: SelectIntegrationCommand,
    isCrossEnvironmentIntegrationEnabled: boolean
  ): Promise<SelectionCandidates> {
    const primary = await this.getPrimaryIntegration(command, isCrossEnvironmentIntegrationEnabled);

    if (command.identifier) {
      return { primary, conditioned: [] };
    }

    const conditioned = await this.integrationRepository.find(
      this.getConditionedIntegrationsQuery(command, isCrossEnvironmentIntegrationEnabled),
      '',
      { sort: { priority: -1, createdAt: -1 } }
    );

    return { primary, conditioned };
  }

  /**
   * Same selection as `getCandidatesFromDatabase`, resolved in memory from one cached list of the
   * channel's active integrations instead of two queries per call.
   */
  @Instrument()
  private async getCandidatesFromCachedIntegrations(
    command: SelectIntegrationCommand,
    isCrossEnvironmentIntegrationEnabled: boolean
  ): Promise<SelectionCandidates> {
    const integrations = await this.getActiveChannelIntegrations(command, isCrossEnvironmentIntegrationEnabled);

    if (command.identifier) {
      const byIdentifier = integrations.find((current) => current.identifier === command.identifier) ?? null;

      return { primary: this.visibleToWorkflows(byIdentifier), conditioned: [] };
    }

    const scoped = integrations.filter(
      (current) =>
        (!command.id || String(current._id) === String(command.id)) &&
        (!command.providerId || current.providerId === command.providerId)
    );
    const isChannelSupportsPrimary = CHANNELS_WITH_PRIMARY.includes(command.channelType);
    const primary = scoped.find((current) => !isChannelSupportsPrimary || current.primary) ?? null;
    const conditioned = scoped.filter(hasSelectionConditions).sort(byPriorityThenNewest);

    return { primary: this.visibleToWorkflows(primary), conditioned };
  }

  /** Active integrations of the channel, newest first, with credentials still encrypted. */
  private async getActiveChannelIntegrations(
    command: SelectIntegrationCommand,
    isCrossEnvironmentIntegrationEnabled: boolean
  ): Promise<IntegrationEntity[]> {
    const query: IntegrationQuery = {
      _organizationId: command.organizationId,
      ...(!isCrossEnvironmentIntegrationEnabled && { _environmentId: command.environmentId }),
      channel: command.channelType,
      active: true,
    };
    const cacheKey = isCrossEnvironmentIntegrationEnabled
      ? `${command.organizationId}:${command.channelType}`
      : `${command.organizationId}:${command.environmentId}:${command.channelType}`;

    return (this.inMemoryLRUCacheService as InMemoryLRUCacheService).get(
      InMemoryLRUCacheStore.CHANNEL_INTEGRATIONS,
      cacheKey,
      () => this.integrationRepository.find(query, '', { sort: { createdAt: -1 } }),
      {
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      }
    );
  }

  private visibleToWorkflows(integration: IntegrationEntity | null): IntegrationEntity | null {
    return integration && !this.isHiddenFromWorkflows(integration) ? integration : null;
  }

  /** Agent Email Inbox is a Human channel. Workflow selection must never return it. */
  private isHiddenFromWorkflows(integration: IntegrationEntity): boolean {
    return integration.providerId === EmailProviderIdEnum.AgentEmailInbox;
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

  private async integrationMatchesConditions(
    command: SelectIntegrationCommand,
    currentIntegration: IntegrationEntity,
    tenant: TenantEntity | null
  ): Promise<boolean> {
    if (hasIntegrationRules(currentIntegration.rules)) {
      const { result } = evaluateIntegrationRules(currentIntegration.rules, {
        payload: command.filterData.payload,
        subscriber: command.filterData.subscriber,
        context: command.filterData.context,
        workflow: command.filterData.workflow,
      });

      return result;
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

    const integration = await this.integrationRepository.findOne(query, undefined, {
      query: { sort: { createdAt: -1 } },
    });

    if (integration && this.isHiddenFromWorkflows(integration)) {
      return null;
    }

    return integration;
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
