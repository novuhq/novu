import { Injectable } from '@nestjs/common';
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
  GetSubscriberPreference,
  GetSubscriberPreferenceCommand,
} from '@novu/application-generic';
import { PreferenceLevelEnum } from '@novu/dal';

import { GetPreferencesCommand } from './get-preferences.command';

@Injectable()
export class GetPreferences {
  constructor(
    private getSubscriberPreferenceUsecase: GetSubscriberPreference,
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference
  ) {}

  async execute(command: GetPreferencesCommand) {
    if (command.level === PreferenceLevelEnum.GLOBAL) {
      const globalPreferenceCommand = GetSubscriberGlobalPreferenceCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      });
      const globalPreferences = await this.getSubscriberGlobalPreference.execute(globalPreferenceCommand);

      return [globalPreferences];
    }

    const preferenceCommand = GetSubscriberPreferenceCommand.create({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      subscriberId: command.subscriberId,
    });

    return await this.getSubscriberPreferenceUsecase.execute(preferenceCommand);
  }
}
