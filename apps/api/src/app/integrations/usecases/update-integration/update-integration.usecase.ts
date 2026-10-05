import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  decryptCredentials,
  encryptCredentials,
  hasIntegrationRules,
  hasLegacyIntegrationConditions,
  PinoLogger,
} from '@novu/application-generic';
import { ControlValuesRepository, EnvironmentRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { CHANNELS_WITH_PRIMARY, ControlValuesLevelEnum } from '@novu/shared';
import type { ClientSession } from 'mongoose';
import { assertIntegrationEnvironmentScope } from '../../utils/assert-integration-environment-scope';
import { assertValidIntegrationRules } from '../../utils/assert-integration-rules';
import { validateOutboundIntegrationCredentials } from '../../utils/validate-outbound-integration-credentials';
import { CheckIntegrationCommand } from '../check-integration/check-integration.command';
import { CheckIntegration } from '../check-integration/check-integration.usecase';
import { ensureNovuAgentManagedCredentials } from '../novu-agent/novu-agent-credentials.utils';
import { ensureWhatsAppManagedCredentials } from '../whatsapp/whatsapp-credentials.utils';
import { maybeStampWhatsNextCompletedAt } from '../whatsapp/whatsapp-whats-next-stamp.utils';
import { UpdateIntegrationCommand } from './update-integration.command';

@Injectable()
export class UpdateIntegration {
  @Inject()
  private checkIntegration: CheckIntegration;
  constructor(
    private integrationRepository: IntegrationRepository,
    private analyticsService: AnalyticsService,
    private environmentRepository: EnvironmentRepository,
    private logger: PinoLogger,
    private controlValuesRepository: ControlValuesRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Step integration overrides are keyed by integration identifier, so a rename carries them along.
   * Overrides already stored under the new identifier (left by a deleted integration, or synced from
   * another environment whose integration uses that identifier) apply to whichever integration holds
   * it, so they are kept; only on steps where both exist does the renamed integration's own win.
   *
   * Overrides are re-keyed in the integration's current environment, and in the destination when the
   * same request moves it, so copies synced there under the old identifier follow it. Identifiers
   * are unique per environment, so the destination may already have its own integration under that
   * identifier; its overrides apply to it and are left in place.
   */
  private async renameStepIntegrationOverrides(
    integration: IntegrationEntity,
    newIdentifier: string,
    environmentIds: string[],
    session: ClientSession | null
  ): Promise<void> {
    for (const environmentId of environmentIds) {
      if (await this.destinationOwnsIdentifier(integration, environmentId, session)) {
        continue;
      }

      const scope = {
        _environmentId: environmentId,
        _organizationId: integration._organizationId,
        level: ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
        providerId: integration.providerId,
      };
      const overrides = await this.controlValuesRepository.find(
        { ...scope, integrationIdentifier: integration.identifier },
        { _stepId: 1 },
        { session }
      );

      if (overrides.length === 0) {
        continue;
      }

      await this.controlValuesRepository.delete(
        {
          ...scope,
          integrationIdentifier: newIdentifier,
          _stepId: { $in: overrides.map((override) => override._stepId) },
        },
        { session }
      );
      await this.controlValuesRepository.update(
        { ...scope, integrationIdentifier: integration.identifier },
        { $set: { integrationIdentifier: newIdentifier } },
        { session }
      );
    }
  }

  /**
   * True when `environmentId` is a move destination whose own integration already holds this
   * identifier for the same provider. Overrides there apply to that integration, not to the one
   * being renamed.
   */
  private async destinationOwnsIdentifier(
    integration: IntegrationEntity,
    environmentId: string,
    session: ClientSession | null
  ): Promise<boolean> {
    if (environmentId === integration._environmentId) {
      return false;
    }

    const owner = await this.integrationRepository.findOne(
      {
        _organizationId: integration._organizationId,
        _environmentId: environmentId,
        identifier: integration.identifier,
      },
      'providerId',
      { session }
    );

    return owner?.providerId === integration.providerId;
  }

  private async calculatePriorityAndPrimaryForActive({
    existingIntegration,
  }: {
    existingIntegration: IntegrationEntity;
  }) {
    const result: { primary: boolean; priority: number } = {
      primary: existingIntegration.primary,
      priority: existingIntegration.priority,
    };

    const highestPriorityIntegration = await this.integrationRepository.findHighestPriorityIntegration({
      _organizationId: existingIntegration._organizationId,
      _environmentId: existingIntegration._environmentId,
      channel: existingIntegration.channel,
    });

    if (highestPriorityIntegration?.primary) {
      result.priority = highestPriorityIntegration.priority;
      await this.integrationRepository.update(
        {
          _id: highestPriorityIntegration._id,
          _organizationId: highestPriorityIntegration._organizationId,
          _environmentId: highestPriorityIntegration._environmentId,
        },
        {
          $set: {
            priority: highestPriorityIntegration.priority + 1,
          },
        }
      );
    } else {
      result.priority = highestPriorityIntegration ? highestPriorityIntegration.priority + 1 : 1;
    }

    return result;
  }

  private async calculatePriorityAndPrimary({
    existingIntegration,
    active,
  }: {
    existingIntegration: IntegrationEntity;
    active: boolean;
  }) {
    let result: { primary: boolean; priority: number } = {
      primary: existingIntegration.primary,
      priority: existingIntegration.priority,
    };

    if (active) {
      result = await this.calculatePriorityAndPrimaryForActive({
        existingIntegration,
      });
    } else {
      await this.integrationRepository.recalculatePriorityForAllActive({
        _id: existingIntegration._id,
        _organizationId: existingIntegration._organizationId,
        _environmentId: existingIntegration._environmentId,
        channel: existingIntegration.channel,
        exclude: true,
      });

      result = {
        priority: 0,
        primary: false,
      };
    }

    return result;
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: validates and applies every optional integration field in one pass
  async execute(command: UpdateIntegrationCommand): Promise<IntegrationEntity> {
    this.logger.trace('Executing Update Integration Command');

    const existingIntegration = await this.integrationRepository.findOne({
      _id: command.integrationId,
      _organizationId: command.organizationId,
    });
    if (!existingIntegration) {
      throw new NotFoundException(`Entity with id ${command.integrationId} not found`);
    }

    assertIntegrationEnvironmentScope({
      restrictToUserEnvironment: command.restrictToUserEnvironment,
      userEnvironmentId: command.userEnvironmentId,
      integrationEnvironmentId: existingIntegration._environmentId,
      action: 'update',
    });

    if (command.environmentId && command.environmentId !== existingIntegration._environmentId) {
      const targetEnvironment = await this.environmentRepository.findByIdAndOrganization(
        command.environmentId,
        command.organizationId
      );
      if (!targetEnvironment) {
        throw new NotFoundException(`Environment with id ${command.environmentId} not found`);
      }
    }

    const identifierHasChanged = command.identifier && command.identifier !== existingIntegration.identifier;
    if (identifierHasChanged) {
      const existingIntegrationWithIdentifier = await this.integrationRepository.findOne({
        _organizationId: command.organizationId,
        identifier: command.identifier,
      });

      if (existingIntegrationWithIdentifier) {
        throw new ConflictException('Integration with identifier already exists');
      }
    }

    this.analyticsService.track('Update Integration - [Integrations]', command.userId, {
      providerId: existingIntegration.providerId,
      channel: existingIntegration.channel,
      _organization: command.organizationId,
      active: command.active,
    });

    const environmentId = command.environmentId ?? existingIntegration._environmentId;
    const credentialsForValidation = command.credentials ?? existingIntegration.credentials ?? {};

    if (command.check || command.credentials) {
      await validateOutboundIntegrationCredentials(existingIntegration.providerId, credentialsForValidation);
    }

    if (command.check) {
      await this.checkIntegration.execute(
        CheckIntegrationCommand.create({
          environmentId,
          organizationId: command.organizationId,
          credentials: credentialsForValidation,
          providerId: existingIntegration.providerId,
          channel: existingIntegration.channel,
        })
      );
    }

    const updatePayload: Partial<IntegrationEntity> = {};
    const isActiveDefined = typeof command.active !== 'undefined';
    const isActiveChanged = isActiveDefined && existingIntegration.active !== command.active;

    if (command.name) {
      updatePayload.name = command.name;
    }

    if (identifierHasChanged) {
      updatePayload.identifier = command.identifier;
    }

    if (command.environmentId) {
      updatePayload._environmentId = environmentId;
    }

    if (isActiveDefined) {
      updatePayload.active = command.active;
    }

    if (command.credentials) {
      const existingCredentials = existingIntegration.credentials
        ? decryptCredentials(existingIntegration.credentials)
        : undefined;
      const whatsAppMerged = ensureWhatsAppManagedCredentials({
        providerId: existingIntegration.providerId,
        nextCredentials: command.credentials,
        existingCredentials,
        allowManagedFlagChange: command.allowNovuManagedWhatsAppCredentials === true,
      });
      const managedCredentials = ensureNovuAgentManagedCredentials({
        providerId: existingIntegration.providerId,
        nextCredentials: whatsAppMerged,
        existingCredentials,
      });
      const stampedCredentials = maybeStampWhatsNextCompletedAt({
        providerId: existingIntegration.providerId,
        existingCredentials,
        nextCredentials: managedCredentials,
      });
      updatePayload.credentials = encryptCredentials(stampedCredentials);
    }

    if (command.configurations) {
      updatePayload.configurations = command.configurations;
    }

    if (command.conditions) {
      updatePayload.conditions = command.conditions;
    }

    if (command.rules !== undefined) {
      assertValidIntegrationRules(command.rules);

      if (hasIntegrationRules(command.rules)) {
        updatePayload.rules = command.rules;
        updatePayload.conditions = [];
      } else {
        updatePayload.rules = null;
      }
    }

    if (!Object.keys(updatePayload).length) {
      throw new BadRequestException('No properties found for update');
    }

    const haveConditions =
      hasIntegrationRules(updatePayload.rules) || hasLegacyIntegrationConditions(updatePayload.conditions);

    const isChannelSupportsPrimary =
      !!existingIntegration.channel && CHANNELS_WITH_PRIMARY.includes(existingIntegration.channel);
    if (isActiveChanged && isChannelSupportsPrimary) {
      const { primary, priority } = await this.calculatePriorityAndPrimary({
        existingIntegration,
        active: !!command.active,
      });

      updatePayload.primary = primary;
      updatePayload.priority = priority;
    }

    const shouldRemovePrimary = haveConditions && existingIntegration.primary;
    if (shouldRemovePrimary) {
      updatePayload.primary = false;
    }

    const newIdentifier = updatePayload.identifier;
    const environmentIdsToRekey = [...new Set([existingIntegration._environmentId, environmentId])];

    await this.integrationRepository.withTransaction(async (session) => {
      await this.integrationRepository.update(
        {
          _id: existingIntegration._id,
          _organizationId: existingIntegration._organizationId,
          _environmentId: existingIntegration._environmentId,
        },
        {
          $set: updatePayload,
        },
        { session }
      );

      if (newIdentifier) {
        await this.renameStepIntegrationOverrides(existingIntegration, newIdentifier, environmentIdsToRekey, session);
      }
    });

    if (shouldRemovePrimary) {
      await this.integrationRepository.recalculatePriorityForAllActive({
        _id: existingIntegration._id,
        _organizationId: existingIntegration._organizationId,
        _environmentId: existingIntegration._environmentId,
        channel: existingIntegration.channel,
      });
    }

    const updatedIntegration = await this.integrationRepository.findOne({
      _id: command.integrationId,
      _organizationId: existingIntegration._organizationId,
      _environmentId: environmentId,
    });
    if (!updatedIntegration) {
      throw new NotFoundException(`Integration with id ${command.integrationId} is not found`);
    }

    return updatedIntegration;
  }
}
