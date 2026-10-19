import { Injectable } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { PreferenceLevelEnum, WorkflowCriticalityEnum } from '@novu/shared';
import { assertGetPreferencesEnabled } from '../../utils/assert-get-preferences-enabled';
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
} from '../get-subscriber-global-preference';
import { GetSubscriberPreference, GetSubscriberPreferenceCommand } from '../get-subscriber-preference';
import { GetPreferencesByLevelCommand } from './get-preferences-by-level.command';

@Injectable()
export class GetPreferencesByLevel {
  constructor(
    private getSubscriberPreferenceUsecase: GetSubscriberPreference,
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference,
    private featureFlagsService: FeatureFlagsService
  ) {}

  async execute(command: GetPreferencesByLevelCommand) {
    await assertGetPreferencesEnabled(this.featureFlagsService, command.organizationId, command.environmentId);

    if (command.level === PreferenceLevelEnum.GLOBAL) {
      const globalPreferenceCommand = GetSubscriberGlobalPreferenceCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        includeInactiveChannels: command.includeInactiveChannels,
      });
      const globalPreferences = await this.getSubscriberGlobalPreference.execute(globalPreferenceCommand);

      return [globalPreferences];
    }

    const preferenceCommand = GetSubscriberPreferenceCommand.create({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      subscriberId: command.subscriberId,
      includeInactiveChannels: command.includeInactiveChannels,
      criticality: WorkflowCriticalityEnum.NON_CRITICAL,
    });

    return await this.getSubscriberPreferenceUsecase.execute(preferenceCommand);
  }
}
