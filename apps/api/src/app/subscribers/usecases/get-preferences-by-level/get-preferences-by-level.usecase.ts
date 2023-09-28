import { Injectable } from '@nestjs/common';
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
  GetSubscriberPreference,
  GetSubscriberPreferenceCommand,
} from '@novu/application-generic';
import { PreferenceLevelEnum } from '@novu/dal';

import { GetPreferencesByLevelCommand } from './get-preferences-by-level.command';

@Injectable()
export class GetPreferencesByLevel {
  constructor(
    private getSubscriberPreferenceUsecase: GetSubscriberPreference,
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference
  ) {}

  async execute(command: GetPreferencesByLevelCommand) {
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
