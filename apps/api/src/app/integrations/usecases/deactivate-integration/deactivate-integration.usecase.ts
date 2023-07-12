import { Injectable } from '@nestjs/common';
import { IntegrationRepository } from '@novu/dal';
import { FeatureFlagCommand, GetIsMultiProviderConfigurationEnabled } from '@novu/application-generic';

import { DeactivateSimilarChannelIntegrationsCommand } from './deactivate-integration.command';

@Injectable()
export class DeactivateSimilarChannelIntegrations {
  constructor(
    private integrationRepository: IntegrationRepository,
    private getIsMultiProviderConfigurationEnabled: GetIsMultiProviderConfigurationEnabled
  ) {}
  async execute(command: DeactivateSimilarChannelIntegrationsCommand): Promise<void> {
    const shouldKeepIntegrationsActive = await this.getIsMultiProviderConfigurationEnabled.execute(
      FeatureFlagCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
      })
    );

    if (shouldKeepIntegrationsActive) {
      return;
    }

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
