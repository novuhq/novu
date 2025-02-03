import { Injectable } from '@nestjs/common';
import { PreferenceLevelEnum } from '@novu/shared';
import { plainToInstance } from 'class-transformer';
import { UpdateSubscriberPreferencesCommand } from './update-subscriber-preferences.command';
import { UpdatePreferences } from '../../../inbox/usecases/update-preferences/update-preferences.usecase';
import { UpdatePreferencesCommand } from '../../../inbox/usecases/update-preferences/update-preferences.command';
import { GetSubscriberPreferencesDto } from '../../dtos/get-subscriber-preferences.dto';
import { GetSubscriberPreferences } from '../get-subscriber-preferences/get-subscriber-preferences.usecase';

@Injectable()
export class UpdateSubscriberPreferences {
  constructor(
    private updatePreferencesUsecase: UpdatePreferences,
    private getSubscriberPreferences: GetSubscriberPreferences
  ) {}

  async execute(command: UpdateSubscriberPreferencesCommand): Promise<GetSubscriberPreferencesDto> {
    await this.updatePreferencesUsecase.execute(
      UpdatePreferencesCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        level: command.workflowId ? PreferenceLevelEnum.TEMPLATE : PreferenceLevelEnum.GLOBAL,
        workflowId: command.workflowId,
        includeInactiveChannels: false,
        ...command.channels,
      })
    );

    const subscriberPreferences = await this.getSubscriberPreferences.execute({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
    });

    return plainToInstance(GetSubscriberPreferencesDto, {
      global: subscriberPreferences.global,
      workflows: subscriberPreferences.workflows,
    });
  }
}
