import { Injectable } from '@nestjs/common';
import { MessageTemplateRepository, NotificationTemplateRepository, SubscriberPreferenceRepository } from '@novu/dal';
import { GetSubscriberPreferenceCommand } from './get-subscriber-preference.command';
import { IPreferenceChannels } from '@novu/shared';
import {
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
} from '../get-subscriber-template-preference';

@Injectable()
export class GetSubscriberPreference {
  constructor(
    private subscriberPreferenceRepository: SubscriberPreferenceRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private getSubscriberTemplatePreferenceUsecase: GetSubscriberTemplatePreference
  ) {}

  async execute(command: GetSubscriberPreferenceCommand): Promise<IGetSubscriberPreferenceResponse[]> {
    const templateList = await this.notificationTemplateRepository.getActiveList(
      command.organizationId,
      command.environmentId,
      true
    );

    const result: IGetSubscriberPreferenceResponse[] = [];

    for (const template of templateList) {
      {
        const buildCommand = GetSubscriberTemplatePreferenceCommand.create({
          organizationId: command.organizationId,
          subscriberId: command.subscriberId,
          environmentId: command.environmentId,
          template,
        });

        const templateSubscriberPreference = await this.getSubscriberTemplatePreferenceUsecase.execute(buildCommand);

        result.push(templateSubscriberPreference);
      }
    }

    return result;
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
