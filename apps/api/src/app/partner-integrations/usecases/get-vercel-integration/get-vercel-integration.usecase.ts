import { Injectable } from '@nestjs/common';
import { OrganizationRepository } from '@novu/dal';

import { GetVercelIntegrationCommand } from './get-vercel-integration.command';

@Injectable()
export class GetVercelIntegration {
  constructor(private organizationRepository: OrganizationRepository) {}

  async execute(command: GetVercelIntegrationCommand) {
    return await this.getConfigurationDetails(command);
  }

  private async getConfigurationDetails(command: GetVercelIntegrationCommand) {
    const details = await this.organizationRepository.findByPartnerConfigurationId({
      userId: command.userId,
      configurationId: command.configurationId,
    });

    return details.reduce(
      (acc, curr) => {
        if (
          curr.partnerConfigurations &&
          curr.partnerConfigurations.length >= 1 &&
          curr.partnerConfigurations[0].projectIds &&
          curr.partnerConfigurations[0].projectIds.length >= 1
        ) {
          acc.push({
            organizationId: curr._id,
            projectIds: curr.partnerConfigurations[0].projectIds,
          });
        }

        return acc;
      },
      [] as { organizationId: string; projectIds: string[] }[]
    );
  }
}
