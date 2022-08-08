import { Injectable } from '@nestjs/common';
import {
  MessageTemplateRepository,
  NotificationTemplateRepository,
  SubscriberPreferenceRepository,
  NotificationTemplateEntity,
} from '@novu/dal';
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

  async execute(command: GetSubscriberPreferenceCommand): Promise<ISubscriberPreferenceResponse[]> {
    const templateList = await this.notificationTemplateRepository.getActiveList(
      command.organizationId,
      command.environmentId,
      true
    );

    return await Promise.all(templateList.map(async (template) => this.getTemplatePreference(template, command)));
  }

  async getTemplatePreference(template: NotificationTemplateEntity, command: GetSubscriberPreferenceCommand) {
    const buildCommand = GetSubscriberTemplatePreferenceCommand.create({
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
      environmentId: command.environmentId,
      template,
    });

    return await this.getSubscriberTemplatePreferenceUsecase.execute(buildCommand);
  }
}

export interface ISubscriberPreferenceResponse {
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
