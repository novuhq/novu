import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import * as shortid from 'shortid';
import slugify from 'slugify';
import { IntegrationEntity, IntegrationRepository, DalException, IntegrationQuery } from '@novu/dal';
import { ChannelTypeEnum, providers, CHANNELS_WITH_PRIMARY } from '@novu/shared';
import {
  AnalyticsService,
  encryptCredentials,
  buildIntegrationKey,
  InvalidateCacheService,
  GetFeatureFlag,
  FeatureFlagCommand,
} from '@novu/application-generic';

import { CreateIntegrationCommand } from './create-integration.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { DeactivateSimilarChannelIntegrations } from '../deactivate-integration/deactivate-integration.usecase';
import { CheckIntegrationCommand } from '../check-integration/check-integration.command';
import { CheckIntegration } from '../check-integration/check-integration.usecase';

@Injectable()
export class CreateIntegration {
  @Inject()
  private checkIntegration: CheckIntegration;
  constructor(
    private invalidateCache: InvalidateCacheService,
    private integrationRepository: IntegrationRepository,
    private deactivateSimilarChannelIntegrations: DeactivateSimilarChannelIntegrations,
    private analyticsService: AnalyticsService,
    private getFeatureFlag: GetFeatureFlag
  ) {}

  async execute(command: CreateIntegrationCommand): Promise<IntegrationEntity> {
    const isMultiProviderConfigurationEnabled = await this.getFeatureFlag.isMultiProviderConfigurationEnabled(
      FeatureFlagCommand.create({
        userId: command.userId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
      })
    );

    if (!isMultiProviderConfigurationEnabled) {
      const existingIntegration = await this.integrationRepository.findOne({
        _environmentId: command.environmentId,
        providerId: command.providerId,
        channel: command.channel,
      });

      if (existingIntegration) {
        throw new BadRequestException(
          'Duplicate key - One environment may not have two providers of the same channel type'
        );
      }
    }

    if (command.identifier) {
      const existingIntegrationWithIdentifier = await this.integrationRepository.findOne({
        _organizationId: command.organizationId,
        identifier: command.identifier,
      });

      if (existingIntegrationWithIdentifier) {
        throw new ConflictException('Integration with identifier already exists');
      }
    }

    this.analyticsService.track('Create Integration - [Integrations]', command.userId, {
      providerId: command.providerId,
      channel: command.channel,
      _organization: command.organizationId,
    });

    try {
      if (command.check) {
        await this.checkIntegration.execute(
          CheckIntegrationCommand.create({
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            providerId: command.providerId,
            channel: command.channel,
            credentials: command.credentials,
          })
        );
      }

      await this.invalidateCache.invalidateQuery({
        key: buildIntegrationKey().invalidate({
          _organizationId: command.organizationId,
        }),
      });

      const providerIdCapitalized = `${command.providerId.charAt(0).toUpperCase()}${command.providerId.slice(1)}`;
      const defaultName =
        providers.find((provider) => provider.id === command.providerId)?.displayName ?? providerIdCapitalized;
      const name = command.name ?? defaultName;
      const identifier = command.identifier ?? `${slugify(name, { lower: true, strict: true })}-${shortid.generate()}`;

      const query: IntegrationQuery = {
        name,
        identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        providerId: command.providerId,
        channel: command.channel,
        credentials: encryptCredentials(command.credentials ?? {}),
        active: command.active,
      };

      const isActiveAndChannelSupportsPrimary = command.active && CHANNELS_WITH_PRIMARY.includes(command.channel);
      if (isMultiProviderConfigurationEnabled && isActiveAndChannelSupportsPrimary) {
        const highestPriorityIntegration = await this.integrationRepository.findHighestPriorityIntegration({
          _organizationId: command.organizationId,
          _environmentId: command.environmentId,
          channel: command.channel,
        });

        if (highestPriorityIntegration?.primary) {
          query.priority = highestPriorityIntegration.priority;
          await this.integrationRepository.update(
            {
              _id: highestPriorityIntegration._id,
              _organizationId: command.organizationId,
              _environmentId: command.environmentId,
            },
            {
              $set: {
                priority: highestPriorityIntegration.priority + 1,
              },
            }
          );
        } else {
          query.priority = highestPriorityIntegration ? highestPriorityIntegration.priority + 1 : 1;
        }

        const activeIntegrationsCount = await this.integrationRepository.countActiveExcludingNovu({
          _organizationId: command.organizationId,
          _environmentId: command.environmentId,
          channel: command.channel,
        });

        if (activeIntegrationsCount === 0) {
          query.primary = true;
        }
      }

      const integrationEntity = await this.integrationRepository.create(query);

      if (
        !isMultiProviderConfigurationEnabled &&
        command.active &&
        ![ChannelTypeEnum.CHAT, ChannelTypeEnum.PUSH].includes(command.channel)
      ) {
        await this.deactivateSimilarChannelIntegrations.execute({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          integrationId: integrationEntity._id,
          channel: command.channel,
          userId: command.userId,
        });
      }

      return integrationEntity;
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }
  }
}
