import { Injectable } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import { GetPreferencesCommand } from './get-preferences.command';
import { GetSubscriberPreferenceCommand } from '../get-subscriber-preference/get-subscriber-preference.command';
import { GetSubscriberPreference } from '../get-subscriber-preference/get-subscriber-preference.usecase';

@Injectable()
export class GetPreferences {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private getSubscriberPreferenceUsecase: GetSubscriberPreference
  ) {}

  async execute(command: GetPreferencesCommand) {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    const preferenceCommand = GetSubscriberPreferenceCommand.create({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      subscriberId: subscriber._id,
    });

    return await this.getSubscriberPreferenceUsecase.execute(preferenceCommand);
  }
}
