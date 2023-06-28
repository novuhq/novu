import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as shortid from 'shortid';
import slugify from 'slugify';
import { IntegrationEntity, IntegrationRepository, DalException } from '@novu/dal';
import { providers } from '@novu/shared';
import {
  AnalyticsService,
  encryptCredentials,
  buildIntegrationKey,
  InvalidateCacheService,
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
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: CreateIntegrationCommand): Promise<IntegrationEntity> {
    if (command.identifier) {
      const existingIntegrationWithIdentifier = await this.integrationRepository.findOne({
        _organizationId: command.organizationId,
        identifier: command.identifier,
      });

      if (existingIntegrationWithIdentifier) {
        throw new BadRequestException('Integration with identifier already exists');
      }
    }

    if (command.active && Object.keys(command.credentials ?? {}).length === 0) {
      throw new BadRequestException('The credentials are required to activate the integration');
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
          _environmentId: command.environmentId,
        }),
      });

      const providerIdCapitalized = `${command.providerId.charAt(0).toUpperCase()}${command.providerId.slice(1)}`;
      const defaultName =
        providers.find((provider) => provider.id === command.providerId)?.displayName ?? providerIdCapitalized;
      const name = command.name ?? defaultName;
      const identifier = command.identifier ?? `${slugify(name, { lower: true, strict: true })}-${shortid.generate()}`;

      const integrationEntity = await this.integrationRepository.create({
        name,
        identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        providerId: command.providerId,
        channel: command.channel,
        credentials: encryptCredentials(command.credentials ?? {}),
        active: command.active,
      });

      return integrationEntity;
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }
  }
}
