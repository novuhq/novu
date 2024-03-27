import { BadRequestException, Injectable, NotFoundException, Inject, Logger, ConflictException } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import {
  AnalyticsService,
  encryptCredentials,
  buildIntegrationKey,
  InvalidateCacheService,
} from '@novu/application-generic';
import { CHANNELS_WITH_PRIMARY } from '@novu/shared';

import { UpdateIntegrationCommand } from './update-integration.command';
import { CheckIntegration } from '../check-integration/check-integration.usecase';
import { CheckIntegrationCommand } from '../check-integration/check-integration.command';

@Injectable()
export class UpdateIntegration {
  @Inject()
  private checkIntegration: CheckIntegration;
  constructor(
    private invalidateCache: InvalidateCacheService,
    private integrationRepository: IntegrationRepository,
    private analyticsService: AnalyticsService
  ) {}

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

  async execute(command: UpdateIntegrationCommand): Promise<IntegrationEntity> {
    Logger.verbose('Executing Update Integration Command');

    const existingIntegration = await this.integrationRepository.findOne({
      _id: command.integrationId,
      _organizationId: command.organizationId,
    });
    if (!existingIntegration) {
      throw new NotFoundException(`Entity with id ${command.integrationId} not found`);
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

    await this.invalidateCache.invalidateQuery({
      key: buildIntegrationKey().invalidate({
        _organizationId: command.organizationId,
      }),
    });

    const environmentId = command.environmentId ?? existingIntegration._environmentId;

    if (command.check) {
      await this.checkIntegration.execute(
        CheckIntegrationCommand.create({
          environmentId,
          organizationId: command.organizationId,
          credentials: command.credentials ?? existingIntegration.credentials ?? {},
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
      updatePayload.credentials = encryptCredentials(command.credentials);
    }

    if (command.conditions) {
      updatePayload.conditions = command.conditions;
    }

    if (!Object.keys(updatePayload).length) {
      throw new BadRequestException('No properties found for update');
    }

    const haveConditions = updatePayload.conditions && updatePayload.conditions?.length > 0;

    const isChannelSupportsPrimary = CHANNELS_WITH_PRIMARY.includes(existingIntegration.channel);
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

    await this.integrationRepository.update(
      {
        _id: existingIntegration._id,
        _environmentId: existingIntegration._environmentId,
      },
      {
        $set: updatePayload,
      }
    );

    if (shouldRemovePrimary) {
      await this.integrationRepository.recalculatePriorityForAllActive({
        _id: existingIntegration._id,
        _organizationId: existingIntegration._organizationId,
        _environmentId: existingIntegration._organizationId,
        channel: existingIntegration.channel,
      });
    }

    const updatedIntegration = await this.integrationRepository.findOne({
      _id: command.integrationId,
      _environmentId: environmentId,
    });
    if (!updatedIntegration) {
      throw new NotFoundException(`Integration with id ${command.integrationId} is not found`);
    }

    return updatedIntegration;
  }
}
