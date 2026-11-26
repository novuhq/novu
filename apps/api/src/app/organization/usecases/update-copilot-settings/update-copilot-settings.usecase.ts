import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { CommunityOrganizationRepository } from '@novu/dal';
import { type IOrganizationCopilotSettings, resolveCopilotSettings } from '@novu/shared';
import { CopilotSettingsDto } from '../../dtos/copilot-settings.dto';
import { UpdateCopilotSettingsCommand } from './update-copilot-settings.command';

const COPILOT_SETTING_KEYS = ['dashboardEnabled', 'slackEnabled', 'editsEnabled'] as const;

@Injectable()
export class UpdateCopilotSettings {
  constructor(
    private organizationRepository: CommunityOrganizationRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: UpdateCopilotSettingsCommand): Promise<CopilotSettingsDto> {
    const organization = await this.organizationRepository.findById(command.organizationId, 'copilotSettings');

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const changes: IOrganizationCopilotSettings = {};
    for (const key of COPILOT_SETTING_KEYS) {
      const value = command[key];
      if (value !== undefined) {
        changes[key] = value;
      }
    }

    if (Object.keys(changes).length === 0) {
      return resolveCopilotSettings(organization.copilotSettings);
    }

    const updateFields = Object.fromEntries(
      Object.entries(changes).map(([key, value]) => [`copilotSettings.${key}`, value])
    );
    await this.organizationRepository.updateOne({ _id: command.organizationId }, { $set: updateFields });

    this.analyticsService.mixpanelTrack('Copilot Settings Updated', command.userId, {
      _organization: command.organizationId,
      ...changes,
    });

    return resolveCopilotSettings({ ...organization.copilotSettings, ...changes });
  }
}
