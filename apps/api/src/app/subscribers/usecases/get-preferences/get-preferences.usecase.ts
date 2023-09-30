import { Injectable } from '@nestjs/common';
import { GetSubscriberPreference, GetSubscriberPreferenceCommand } from '@novu/application-generic';

import { GetPreferencesCommand } from './get-preferences.command';

@Injectable()
export class GetPreferences {
  constructor(private getSubscriberPreferenceUsecase: GetSubscriberPreference) {}

  async execute(command: GetPreferencesCommand) {
    const preferenceCommand = GetSubscriberPreferenceCommand.create({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      subscriberId: command.subscriberId,
    });

    return await this.getSubscriberPreferenceUsecase.execute(preferenceCommand);
  }
}
