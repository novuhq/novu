import { Injectable } from '@nestjs/common';
import { OrganizationRepository } from '@novu/dal';
import { GetVercelConfigurationCommand } from './get-vercel-configuration.command';

@Injectable()
export class GetVercelConfiguration {
  constructor(private organizationRepository: OrganizationRepository) {}

  async execute(command: GetVercelConfigurationCommand) {
    return await this.getConfigurationDetails(command);
  }

  private async getConfigurationDetails(command: GetVercelConfigurationCommand) {
    const details = await this.organizationRepository.findPartnerConfigurationDetails(
      command.organizationId,
      command.userId,
      command.configurationId
    );

    return details.reduce((acc, curr) => {
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
    }, [] as { organizationId: string; projectIds: string[] }[]);
  }
}
