import { Injectable } from '@nestjs/common';
import { UpdateSubscriberPreference, UpdateSubscriberPreferenceCommand } from '../update-subscriber-preference';
import { UpdatePreferenceCommand } from './update-preference.command';

@Injectable()
export class UpdatePreference {
  constructor(private updateSubscriberPreferenceUsecase: UpdateSubscriberPreference) {}

  async execute(command: UpdatePreferenceCommand) {
    const updateCommand = UpdateSubscriberPreferenceCommand.create({
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
      environmentId: command.environmentId,
      templateId: command.templateId,
      channel: command.channel,
      enabled: command.enabled,
    });

    return await this.updateSubscriberPreferenceUsecase.execute(updateCommand);
  }
}
