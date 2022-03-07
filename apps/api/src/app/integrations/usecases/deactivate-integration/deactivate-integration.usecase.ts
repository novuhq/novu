import { Injectable } from '@nestjs/common';
import { IntegrationRepository } from '@notifire/dal';
import { DeactivateIntegrationCommand } from './deactivate-integration.command';

@Injectable()
export class DeactivateIntegration {
  constructor(private integrationRepository: IntegrationRepository) {}
  /*
   * Deactivates other relevant integration
   */
  async execute(command: DeactivateIntegrationCommand): Promise<void> {
    const otherExistedIntegration = await this.integrationRepository.find({
      _id: { $ne: command.integrationId },
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
