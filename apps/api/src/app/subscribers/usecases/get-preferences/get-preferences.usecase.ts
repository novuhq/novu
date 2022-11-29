import { Injectable } from '@nestjs/common';
import { GetPreferencesCommand } from './get-preferences.command';
import { GetSubscriberPreferenceCommand } from '../get-subscriber-preference/get-subscriber-preference.command';
import { GetSubscriberPreference } from '../get-subscriber-preference/get-subscriber-preference.usecase';

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
