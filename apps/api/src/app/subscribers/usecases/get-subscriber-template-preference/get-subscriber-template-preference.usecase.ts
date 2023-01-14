import { Injectable } from '@nestjs/common';
import {
  MessageTemplateRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  SubscriberPreferenceRepository,
  SubscriberRepository,
  SubscriberEntity,
  SubscriberPreferenceEntity,
} from '@novu/dal';
import { ChannelTypeEnum } from '@novu/stateless';
import { IPreferenceChannels } from '@novu/shared';
import {
  IGetSubscriberPreferenceTemplateResponse,
  ISubscriberPreferenceResponse,
} from '../get-subscriber-preference/get-subscriber-preference.usecase';
import { GetSubscriberTemplatePreferenceCommand } from './get-subscriber-template-preference.command';
import { CachedEntity } from '../../../shared/interceptors/cached-entity.interceptor';
import { KeyGenerator } from '../../../shared/services/cache/keys';

@Injectable()
export class GetSubscriberTemplatePreference {
  constructor(
    private subscriberPreferenceRepository: SubscriberPreferenceRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: GetSubscriberTemplatePreferenceCommand): Promise<ISubscriberPreferenceResponse> {
    const activeChannels = await this.queryActiveChannels(command);
    const subscriberPreference = await this.getSubscriberPreference(command);

    const responseTemplate = mapResponseTemplate(command.template);
    const subscriberPreferenceEnabled = subscriberPreference?.enabled ?? true;

    if (subscriberPreferenceIsWhole(subscriberPreference?.channels, activeChannels)) {
      return getResponse(responseTemplate, subscriberPreferenceEnabled, subscriberPreference?.channels, activeChannels);
    }

    const templatePreference = command.template.preferenceSettings;

    if (templatePreference) {
      if (!subscriberPreference?.channels) {
        return getResponse(responseTemplate, subscriberPreferenceEnabled, templatePreference, activeChannels);
      }

      const mergedPreference = Object.assign({}, templatePreference, subscriberPreference.channels);

      return getResponse(responseTemplate, subscriberPreferenceEnabled, mergedPreference, activeChannels);
    }

    return getNoSettingFallback(responseTemplate, activeChannels);
  }

  private async getSubscriberPreference(command: GetSubscriberTemplatePreferenceCommand) {
    let _subscriberId = (command.subscriber as { _subscriberId: string })._subscriberId || undefined;

    if (!_subscriberId) {
      const subscriber = await this.fetchSubscriber({
        _environmentId: command.environmentId,
        subscriberId: (command.subscriber as { subscriberId: string }).subscriberId,
      });

      _subscriberId = subscriber?._id;
    }

    let subscriberPreference: SubscriberPreferenceEntity | null = null;

    if (_subscriberId) {
      subscriberPreference = await this.subscriberPreferenceRepository.findOne({
        _environmentId: command.environmentId,
        _subscriberId: _subscriberId,
        _templateId: command.template._id,
      });
    }

    return subscriberPreference;
  }

  private async queryActiveChannels(command: GetSubscriberTemplatePreferenceCommand): Promise<ChannelTypeEnum[]> {
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

  @CachedEntity({
    builder: KeyGenerator.subscriber,
  })
  private async fetchSubscriber({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): Promise<SubscriberEntity | null> {
    return await this.subscriberRepository.findBySubscriberId(_environmentId, subscriberId);
  }
}

function filterActiveChannels(
  activeChannels: ChannelTypeEnum[],
  preference?: IPreferenceChannels
): IPreferenceChannels {
  const filteredChannels = Object.assign({}, preference);
  for (const key in preference) {
    if (!activeChannels.some((channel) => channel === key)) {
      delete filteredChannels[key];
    }
  }

  return filteredChannels;
}

function getNoSettingFallback(
  template: IGetSubscriberPreferenceTemplateResponse,
  activeChannels: ChannelTypeEnum[]
): ISubscriberPreferenceResponse {
  return getResponse(
    template,
    true,
    {
      email: true,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    },
    activeChannels
  );
}

function mapResponseTemplate(template: NotificationTemplateEntity): IGetSubscriberPreferenceTemplateResponse {
  return {
    _id: template._id,
    name: template.name,
    critical: template.critical != null ? template.critical : true,
  };
}

function subscriberPreferenceIsWhole(
  preference?: IPreferenceChannels | null,
  activeChannels?: ChannelTypeEnum[] | null
): boolean {
  if (!preference || !activeChannels) return false;

  return Object.keys(preference).length === activeChannels.length;
}

function getResponse(
  responseTemplate: IGetSubscriberPreferenceTemplateResponse,
  subscriberPreferenceEnabled: boolean,
  subscriberPreferenceChannels: IPreferenceChannels | undefined,
  activeChannels: ChannelTypeEnum[]
): ISubscriberPreferenceResponse {
  return {
    template: responseTemplate,
    preference: {
      enabled: subscriberPreferenceEnabled,
      channels: filterActiveChannels(activeChannels, subscriberPreferenceChannels),
    },
  };
}
