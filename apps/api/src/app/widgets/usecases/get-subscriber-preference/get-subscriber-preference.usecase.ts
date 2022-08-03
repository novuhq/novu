import { Injectable } from '@nestjs/common';
import { MessageTemplateRepository, NotificationTemplateRepository, SubscriberPreferenceRepository } from '@novu/dal';
import { GetSubscriberPreferenceCommand } from './get-subscriber-preference.command';
import { IPreferenceChannels } from '@novu/shared';
import {
  BuildSubscriberPreferenceTemplateCommand,
  BuildSubscriberPreferenceTemplate,
} from '../build-subscriber-preference-template';

@Injectable()
export class GetSubscriberPreference {
  constructor(
    private subscriberPreferenceRepository: SubscriberPreferenceRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private buildSubscriberPreferenceTemplateUsecase: BuildSubscriberPreferenceTemplate
  ) {}

  async execute(command: GetSubscriberPreferenceCommand): Promise<IGetSubscriberPreferenceResponse[]> {
    const templateList = await this.notificationTemplateRepository.getActiveList(
      command.organizationId,
      command.environmentId,
      true
    );

    const subscriberPreferences = await this.querySubscriberPreference(
      templateList.map((temp) => temp._id),
      command
    );

    const result: IGetSubscriberPreferenceResponse[] = [];

    for (const template of templateList) {
      {
        const buildCommand = BuildSubscriberPreferenceTemplateCommand.create({
          organizationId: command.organizationId,
          subscriberId: command.subscriberId,
          environmentId: command.environmentId,
          subscriberPreferences,
          template,
        });

        const templateSubscriberPreference = await this.buildSubscriberPreferenceTemplateUsecase.execute(buildCommand);

        result.push(templateSubscriberPreference);
      }
    }

    return result;
  }

  private async querySubscriberPreference(templatesIds: string[], command: GetSubscriberPreferenceCommand) {
    return await this.subscriberPreferenceRepository.findSubscriberPreferences(
      command.environmentId,
      command.subscriberId,
      templatesIds
    );
  }
}

export interface IGetSubscriberPreferenceResponse {
  template: IGetSubscriberPreferenceTemplateResponse;
  preference: {
    enabled: boolean;
    channels: IPreferenceChannels;
  };
}

export interface IGetSubscriberPreferenceTemplateResponse {
  _id: string;
  name: string;
  critical: boolean;
}
