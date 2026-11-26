import { Injectable, NotFoundException } from '@nestjs/common';
import { CommunityOrganizationRepository } from '@novu/dal';
import { resolveCopilotSettings } from '@novu/shared';
import { CopilotSettingsDto } from '../../dtos/copilot-settings.dto';
import { GetCopilotSettingsCommand } from './get-copilot-settings.command';

@Injectable()
export class GetCopilotSettings {
  constructor(private organizationRepository: CommunityOrganizationRepository) {}

  async execute(command: GetCopilotSettingsCommand): Promise<CopilotSettingsDto> {
    const organization = await this.organizationRepository.findById(command.organizationId, 'copilotSettings');

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return resolveCopilotSettings(organization.copilotSettings);
  }
}
