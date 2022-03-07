import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository, DalException } from '@notifire/dal';
import { CreateIntegrationCommand } from './create-integration.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class CreateIntegration {
  constructor(private integrationRepository: IntegrationRepository) {}

  async execute(command: CreateIntegrationCommand): Promise<IntegrationEntity> {
    let response: IntegrationEntity;

    try {
      response = await this.integrationRepository.create({
        _applicationId: command.applicationId,
        _organizationId: command.organizationId,
        providerId: command.providerId,
        channel: command.channel,
        credentials: command.credentials,
        active: command.active,
      });

      await this.deactivatedOtherActiveChannels(command, response._id);
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
    }

    return response;
  }

  async deactivatedOtherActiveChannels(command: CreateIntegrationCommand, integrationId): Promise<void> {
    const otherExistedIntegration = await this.integrationRepository.find({
      _id: { $ne: integrationId },
      _applicationId: command.applicationId,
      channel: command.channel,
      active: true,
    });

    if (otherExistedIntegration.length) {
      await this.integrationRepository.update(
        { _id: { $in: otherExistedIntegration.map((i) => i._id) } },
        { $set: { active: false } }
      );
    }
  }
}
