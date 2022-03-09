import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@notifire/dal';
import { UpdateIntegrationCommand } from './update-integration.command';
import { DeactivateSimilarChannelIntegrations } from '../deactivate-integration/deactivate-integration.usecase';

@Injectable()
export class UpdateIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    private deactivateSimilarChannelIntegrations: DeactivateSimilarChannelIntegrations
  ) {}

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
      await this.deactivateSimilarChannelIntegrations.execute({
        applicationId: command.applicationId,
        organizationId: command.organizationId,
        integrationId: command.integrationId,
        channel: existingIntegration.channel,
      });
    }

    return await this.integrationRepository.findOne({
      _id: command.integrationId,
      _applicationId: command.applicationId,
    });
  }
}
