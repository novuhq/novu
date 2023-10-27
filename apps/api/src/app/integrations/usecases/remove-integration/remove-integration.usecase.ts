import { Injectable, NotFoundException, Scope } from '@nestjs/common';
import { IntegrationRepository, DalException } from '@novu/dal';
import { CHANNELS_WITH_PRIMARY } from '@novu/shared';
import { buildIntegrationKey, InvalidateCacheService } from '@novu/application-generic';

import { RemoveIntegrationCommand } from './remove-integration.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable({
  scope: Scope.REQUEST,
})
export class RemoveIntegration {
  constructor(private invalidateCache: InvalidateCacheService, private integrationRepository: IntegrationRepository) {}

  async execute(command: RemoveIntegrationCommand) {
    try {
      const existingIntegration = await this.integrationRepository.findOne({
        _id: command.integrationId,
        _organizationId: command.organizationId,
      });
      if (!existingIntegration) {
        throw new NotFoundException(`Entity with id ${command.integrationId} not found`);
      }

      await this.invalidateCache.invalidateQuery({
        key: buildIntegrationKey().invalidate({
          _organizationId: command.organizationId,
        }),
      });

      await this.integrationRepository.delete({
        _id: existingIntegration._id,
        _organizationId: existingIntegration._organizationId,
      });

      const isChannelSupportsPrimary = CHANNELS_WITH_PRIMARY.includes(existingIntegration.channel);
      if (isChannelSupportsPrimary) {
        await this.integrationRepository.recalculatePriorityForAllActive({
          _organizationId: existingIntegration._organizationId,
          _environmentId: existingIntegration._environmentId,
          channel: existingIntegration.channel,
        });
      }
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }

    return await this.integrationRepository.find({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
  }
}
