import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@notifire/dal';
import { UpdateIntegrationCommand } from './update-integration.command';

@Injectable()
export class UpdateIntegration {
  constructor(private integrationRepository: IntegrationRepository) {}

  async execute(command: UpdateIntegrationCommand): Promise<IntegrationEntity> {
    const existingIntegration = await this.integrationRepository.findById(command.integrationId);
    if (!existingIntegration) throw new NotFoundException(`Entity with id ${command.integrationId} not found`);

    const updatePayload: Partial<IntegrationEntity> = {};

    if (command.active) {
      updatePayload.active = command.active;
    }

    if (command.credentials) {
      updatePayload.credentials = command.credentials;
    }

    if (!Object.keys(updatePayload).length) {
      throw new BadRequestException('No properties found for update');
    }

    await this.integrationRepository.update(
      {
        _id: command.integrationId,
        _applicationId: command.applicationId,
      },
      {
        $set: updatePayload,
      }
    );

    if (command.active) {
      await this.deactivatedOtherActiveChannels(command, existingIntegration.channel);
    }

    return await this.integrationRepository.findOne({
      _id: command.integrationId,
      _applicationId: command.applicationId,
    });
  }

  async deactivatedOtherActiveChannels(command: UpdateIntegrationCommand, channelType: string): Promise<void> {
    const otherExistedIntegration = await this.integrationRepository.find({
      _id: { $ne: command.integrationId },
      _applicationId: command.applicationId,
      channel: channelType,
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
