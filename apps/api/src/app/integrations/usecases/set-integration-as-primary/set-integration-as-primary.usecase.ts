import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { CHANNELS_WITH_PRIMARY } from '@novu/shared';
import { AnalyticsService, buildIntegrationKey, InvalidateCacheService } from '@novu/application-generic';

import { SetIntegrationAsPrimaryCommand } from './set-integration-as-primary.command';

@Injectable()
export class SetIntegrationAsPrimary {
  constructor(
    private invalidateCache: InvalidateCacheService,
    private integrationRepository: IntegrationRepository,
    private analyticsService: AnalyticsService
  ) {}

  private async updatePrimaryFlag({ existingIntegration }: { existingIntegration: IntegrationEntity }) {
    await this.integrationRepository.update(
      {
        _organizationId: existingIntegration._organizationId,
        _environmentId: existingIntegration._environmentId,
        channel: existingIntegration.channel,
        active: true,
        primary: true,
      },
      {
        $set: {
          primary: false,
        },
      }
    );

    await this.integrationRepository.update(
      {
        _id: existingIntegration._id,
        _organizationId: existingIntegration._organizationId,
        _environmentId: existingIntegration._environmentId,
      },
      {
        $set: {
          active: true,
          primary: true,
          conditions: [],
        },
      }
    );
  }

  async execute(command: SetIntegrationAsPrimaryCommand): Promise<IntegrationEntity> {
    Logger.verbose('Executing Set Integration As Primary Usecase');

    const existingIntegration = await this.integrationRepository.findOne({
      _id: command.integrationId,
      _organizationId: command.organizationId,
    });
    if (!existingIntegration) {
      throw new NotFoundException(`Integration with id ${command.integrationId} not found`);
    }

    if (!CHANNELS_WITH_PRIMARY.includes(existingIntegration.channel)) {
      throw new BadRequestException(`Channel ${existingIntegration.channel} does not support primary`);
    }

    const { _organizationId, _environmentId, channel, providerId } = existingIntegration;
    if (existingIntegration.primary) {
      return existingIntegration;
    }

    this.analyticsService.track('Set Integration As Primary - [Integrations]', command.userId, {
      providerId,
      channel,
      _organizationId,
      _environmentId,
    });

    await this.invalidateCache.invalidateQuery({
      key: buildIntegrationKey().invalidate({
        _organizationId,
      }),
    });

    await this.updatePrimaryFlag({ existingIntegration });

    await this.integrationRepository.recalculatePriorityForAllActive({
      _id: existingIntegration._id,
      _organizationId,
      _environmentId,
      channel,
    });

    const updatedIntegration = await this.integrationRepository.findOne({
      _id: command.integrationId,
      _organizationId,
      _environmentId,
    });
    if (!updatedIntegration) throw new NotFoundException(`Integration with id ${command.integrationId} is not found`);

    return updatedIntegration;
  }
}
