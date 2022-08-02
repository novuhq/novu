import { Injectable } from '@nestjs/common';
import {
  MessageTemplateRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  SubscriberPreferenceRepository,
  SubscriberPreferenceEntity,
} from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';
import { IPreferenceChannels } from '@novu/shared';
import { BuildSubscriberPreferenceTemplateCommand } from './build-subscriber-preference-template.command';
import {
  IGetSubscriberPreferenceResponse,
  IGetSubscriberPreferenceTemplateResponse,
} from '../get-subscriber-preference/get-subscriber-preference.usecase';

@Injectable()
export class BuildSubscriberPreferenceTemplate {
  constructor(
    private subscriberPreferenceRepository: SubscriberPreferenceRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository
  ) {}

  async execute(command: BuildSubscriberPreferenceTemplateCommand): Promise<IGetSubscriberPreferenceResponse> {
    const activeChannels = await this.queryActiveChannels(command);

    let currSubscriberPreference: SubscriberPreferenceEntity;

    if (command?.subscriberPreferences) {
      currSubscriberPreference = command?.subscriberPreferences.find(
        (preference) => preference._templateId === command.template._id
      );
    } else {
      currSubscriberPreference = await this.subscriberPreferenceRepository.findOne({
        _environmentId: command.environmentId,
        _subscriberId: command.subscriberId,
        _templatesId: command.template._id,
      });
    }

    const responseTemplate = mapResponseTemplate(command.template);

    if (currSubscriberPreference) {
      return {
        template: responseTemplate,
        preference: {
          enabled: currSubscriberPreference.enabled,
          channels: filterActiveChannels(currSubscriberPreference.channels, activeChannels),
        },
      };
    }

    return getNoSettingFallback(responseTemplate, activeChannels);
  }

  private async queryActiveChannels(command: BuildSubscriberPreferenceTemplateCommand): Promise<ChannelTypeEnum[]> {
    const messageIds = command.template.steps.filter((step) => step.active === true).map((step) => step._templateId);

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
  template: IGetSubscriberPreferenceTemplateResponse,
  activeChannels: ChannelTypeEnum[]
): IGetSubscriberPreferenceResponse {
  return {
    template,
    preference: {
      enabled: true,
      channels: filterActiveChannels(
        { email: true, sms: true, in_app: true, direct: true, push: true },
        activeChannels
      ),
    },
  };
}

function mapResponseTemplate(template: NotificationTemplateEntity): IGetSubscriberPreferenceTemplateResponse {
  return {
    _id: template._id,
    name: template.name,
    critical: template.critical != null ? template.critical : true,
  };
}
