import { Injectable } from '@nestjs/common';
import { IntegrationRepository } from '@novu/dal';
import { DeactivateSimilarChannelIntegrationsCommand } from './deactivate-integration.command';

@Injectable()
export class DeactivateSimilarChannelIntegrations {
  constructor(private integrationRepository: IntegrationRepository) {}
  async execute(command: DeactivateSimilarChannelIntegrationsCommand): Promise<void> {
    const otherExistedIntegration = await this.integrationRepository.find({
      _id: { $ne: command.integrationId },
      _environmentId: command.environmentId,
      channel: command.channel,
      active: true,
    });

    if (otherExistedIntegration.length) {
      await this.integrationRepository.update(
        { _environmentId: command.environmentId, _id: { $in: otherExistedIntegration.map((i) => i._id) } },
        { $set: { active: false } }
      );
    }
  }
}
