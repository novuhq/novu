import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import * as shortid from 'shortid';
import slugify from 'slugify';
import { IntegrationEntity, IntegrationRepository, DalException, IntegrationQuery } from '@novu/dal';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  providers,
  SmsProviderIdEnum,
  InAppProviderIdEnum,
  CHANNELS_WITH_PRIMARY,
} from '@novu/shared';
import {
  AnalyticsService,
  encryptCredentials,
  buildIntegrationKey,
  InvalidateCacheService,
  GetIsMultiProviderConfigurationEnabled,
  FeatureFlagCommand,
} from '@novu/application-generic';

import { CreateIntegrationCommand } from './create-integration.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { DeactivateSimilarChannelIntegrations } from '../deactivate-integration/deactivate-integration.usecase';
import { CheckIntegrationCommand } from '../check-integration/check-integration.command';
import { CheckIntegration } from '../check-integration/check-integration.usecase';
import { DisableNovuIntegration } from '../disable-novu-integration/disable-novu-integration.usecase';

@Injectable()
export class CreateIntegration {
  @Inject()
  private checkIntegration: CheckIntegration;
  constructor(
    private invalidateCache: InvalidateCacheService,
    private integrationRepository: IntegrationRepository,
    private deactivateSimilarChannelIntegrations: DeactivateSimilarChannelIntegrations,
    private analyticsService: AnalyticsService,
    private disableNovuIntegration: DisableNovuIntegration,
    private getIsMultiProviderConfigurationEnabled: GetIsMultiProviderConfigurationEnabled
  ) {}

  private async calculatePriorityAndPrimary(command: CreateIntegrationCommand) {
    const result: { primary: boolean; priority: number } = {
      primary: false,
      priority: 0,
    };

    const highestPriorityIntegration = await this.integrationRepository.findHighestPriorityIntegration({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      channel: command.channel,
    });

    if (highestPriorityIntegration?.primary) {
      result.priority = highestPriorityIntegration.priority;
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
      result.priority = highestPriorityIntegration ? highestPriorityIntegration.priority + 1 : 1;
    }

    const activeIntegrationsCount = await this.integrationRepository.countActiveExcludingNovu({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      channel: command.channel,
    });

    if (activeIntegrationsCount === 0) {
      result.primary = true;
    }

    return result;
  }

  async execute(command: CreateIntegrationCommand): Promise<IntegrationEntity> {
    const isMultiProviderConfigurationEnabled = await this.getIsMultiProviderConfigurationEnabled.execute(
      FeatureFlagCommand.create({
        userId: command.userId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
      })
    );

    const existingIntegration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      providerId: command.providerId,
      channel: command.channel,
    });

    if (!isMultiProviderConfigurationEnabled && existingIntegration) {
      throw new BadRequestException(
        'Duplicate key - One environment may not have two providers of the same channel type'
      );
    }

    if (
      existingIntegration &&
      command.providerId === InAppProviderIdEnum.Novu &&
      command.channel === ChannelTypeEnum.IN_APP
    ) {
      throw new BadRequestException('One environment can only have one In app provider');
    }

    if (command.providerId === SmsProviderIdEnum.Novu || command.providerId === EmailProviderIdEnum.Novu) {
      const count = await this.integrationRepository.count({
        _environmentId: command.environmentId,
        providerId: EmailProviderIdEnum.Novu,
        channel: command.channel,
      });

      if (count > 0) {
        throw new ConflictException(
          `Integration with novu provider for ${command.channel.toLowerCase()} channel already exists`
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
        await this.disableNovuIntegration.execute({
          channel: command.channel,
          providerId: command.providerId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
        });

        const { primary, priority } = await this.calculatePriorityAndPrimary(command);

        query.primary = primary;
        query.priority = priority;
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
