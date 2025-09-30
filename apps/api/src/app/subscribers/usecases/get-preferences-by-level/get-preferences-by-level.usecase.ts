import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum, PreferenceLevelEnum, WorkflowCriticalityEnum } from '@novu/shared';
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
    const isGetPreferencesDisabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_GET_PREFERENCES_DISABLED,
      defaultValue: false,
      organization: { _id: command.organizationId },
      environment: { _id: command.environmentId },
    });

    if (isGetPreferencesDisabled) {
      throw new ServiceUnavailableException('Get preferences service is currently unavailable');
    }

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
