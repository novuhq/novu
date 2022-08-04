import { Injectable } from '@nestjs/common';
import { SubscriberRepository } from '@novu/dal';
import {
  UpdateSubscriberPreference,
  UpdateSubscriberPreferenceCommand,
} from '../../../widgets/usecases/update-subscriber-preference';
import { UpdatePreferenceCommand } from './update-preference.command';

@Injectable()
export class UpdatePreference {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private updateSubscriberPreferenceUsecase: UpdateSubscriberPreference
  ) {}

  async execute(command: UpdatePreferenceCommand) {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    const updateCommand = UpdateSubscriberPreferenceCommand.create({
      organizationId: command.organizationId,
      subscriberId: subscriber._id,
      environmentId: command.environmentId,
      templateId: command.templateId,
      channel: command.channel,
      enabled: command.enabled,
    });

    return await this.updateSubscriberPreferenceUsecase.execute(updateCommand);
  }
}
