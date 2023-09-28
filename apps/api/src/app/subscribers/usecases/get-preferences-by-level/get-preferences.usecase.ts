import { Injectable } from '@nestjs/common';
import { GetSubscriberPreference, GetSubscriberPreferenceCommand } from '@novu/application-generic';
import { PreferenceLevelEnum } from '@novu/dal';

import { GetPreferencesCommand } from './get-preferences.command';

@Injectable()
export class GetPreferences {
  constructor(private getSubscriberPreferenceUsecase: GetSubscriberPreference) {}

  async execute(command: GetPreferencesCommand) {
    if (command.level === PreferenceLevelEnum.GLOBAL) {
    }
    const preferenceCommand = GetSubscriberPreferenceCommand.create({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      subscriberId: command.subscriberId,
    });

    return await this.getSubscriberPreferenceUsecase.execute(preferenceCommand);
  }
}
