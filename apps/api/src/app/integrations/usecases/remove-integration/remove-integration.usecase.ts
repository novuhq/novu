import { BadRequestException, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { DalException, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { CHANNELS_WITH_PRIMARY, ChannelTypeEnum, EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';

import { assertIntegrationEnvironmentScope } from '../../utils/assert-integration-environment-scope';
import { RemoveIntegrationCommand } from './remove-integration.command';

@Injectable({
  scope: Scope.REQUEST,
})
export class RemoveIntegration {
  constructor(private integrationRepository: IntegrationRepository) {}

  async execute(command: RemoveIntegrationCommand) {
    try {
      const existingIntegration = await this.integrationRepository.findOne({
        _id: command.integrationId,
        _organizationId: command.organizationId,
      });
      if (!existingIntegration) {
        throw new NotFoundException(`Entity with id ${command.integrationId} not found`);
      }

      assertIntegrationEnvironmentScope({
        restrictToUserEnvironment: command.restrictToUserEnvironment,
        userEnvironmentId: command.environmentId,
        integrationEnvironmentId: existingIntegration._environmentId,
        action: 'delete',
      });

      await this.integrationRepository.delete({
        _id: existingIntegration._id,
        _organizationId: existingIntegration._organizationId,
      });

      const { channel } = existingIntegration;
      const isChannelSupportsPrimary = !!channel && CHANNELS_WITH_PRIMARY.includes(channel);
      if (isChannelSupportsPrimary) {
        await this.integrationRepository.recalculatePriorityForAllActive({
          _organizationId: existingIntegration._organizationId,
          _environmentId: existingIntegration._environmentId,
          channel,
        });
      }
    } catch (e) {
      if (e instanceof DalException) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }

    return await this.integrationRepository.find({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
  }
}
