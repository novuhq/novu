import { Injectable } from '@nestjs/common';
import {
  MessageTemplateRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  SubscriberPreferenceRepository,
} from '@novu/dal';
import { GetSubscriberPreferenceCommand } from './get-subscriber-preference.command';
import { ChannelTypeEnum } from '@novu/stateless';
import { IPreferenceChannels } from '@novu/shared';

@Injectable()
export class GetSubscriberPreference {
  constructor(
    private subscriberPreferenceRepository: SubscriberPreferenceRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository
  ) {}

  async execute(command: GetSubscriberPreferenceCommand): Promise<IGetSubscriberPreferenceResponse[]> {
    const templateList = await this.notificationTemplateRepository.getActiveList(
      command.organizationId,
      command.environmentId,
      true
    );

    const subscriberPreferences = await this.querySubscriberPreference(templateList, command);

    const result: IGetSubscriberPreferenceResponse[] = [];

    for (const template of templateList) {
      {
        const activeChannels = await this.queryActiveChannels(template, command);

        const currSubscriberPreference = subscriberPreferences.find(
          (preference) => preference._templateId === template._id
        );

        if (currSubscriberPreference) {
          result.push({
            template: template,
            preference: {
              enabled: currSubscriberPreference.enabled,
              channels: filterActiveChannels(currSubscriberPreference.channels, activeChannels),
            },
          });

          continue;
        }

        /*
         * create template default fallback
         * add here the template(or fallback) is critical as well
         */

        result.push(getNoSettingFallback(template, activeChannels));
      }
    }

    return result;
  }

  private async querySubscriberPreference(
    templateList: NotificationTemplateEntity[],
    command: GetSubscriberPreferenceCommand
  ) {
    const templatesIds = templateList.map((template) => template._id);

    return await this.subscriberPreferenceRepository.findSubscriberPreferences(
      command.environmentId,
      command.subscriberId,
      templatesIds
    );
  }

  private async queryActiveChannels(
    template: NotificationTemplateEntity,
    command: GetSubscriberPreferenceCommand
  ): Promise<ChannelTypeEnum[]> {
    const messageIds = template.steps.filter((step) => step.active === true).map((step) => step._templateId);

    const messageTemplates = await this.messageTemplateRepository.find({
      _environmentId: command.environmentId,
      _id: {
        $in: messageIds,
      },
    });

    return [
      ...new Set(messageTemplates.map((messageTemplate) => messageTemplate.type) as unknown as ChannelTypeEnum[]),
    ];
  }
}

function filterActiveChannels(channels: IPreferenceChannels, activeChannels: ChannelTypeEnum[]): IPreferenceChannels {
  const filteredChannels = Object.assign({}, channels);

  for (const key in channels) {
    if (!activeChannels.some((channel) => channel === key)) {
      delete filteredChannels[key];
    }
  }

  return filteredChannels;
}

function getNoSettingFallback(
  template: NotificationTemplateEntity,
  activeChannels: ChannelTypeEnum[]
): IGetSubscriberPreferenceResponse {
  // add here the template(or fallback) is critical as well
  return {
    template: template,
    preference: {
      enabled: true,
      channels: filterActiveChannels(
        { email: true, sms: true, in_app: true, direct: true, push: true },
        activeChannels
      ),
    },
  };
}

export interface IGetSubscriberPreferenceResponse {
  template: NotificationTemplateEntity;
  preference: {
    enabled: boolean;
    channels: IPreferenceChannels;
  };
}
