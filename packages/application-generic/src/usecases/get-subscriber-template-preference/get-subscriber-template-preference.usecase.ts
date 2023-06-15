import { Injectable } from '@nestjs/common';
import {
  NotificationTemplateEntity,
  SubscriberPreferenceRepository,
  SubscriberRepository,
  SubscriberEntity,
  MessageTemplateRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  IPreferenceChannels,
  StepTypeEnum,
} from '@novu/shared';

import {
  ITemplateConfiguration,
  ISubscriberPreferenceResponse,
  IPreferenceOverride,
} from '../get-subscriber-preference';
import { GetSubscriberTemplatePreferenceCommand } from './get-subscriber-template-preference.command';
import { ApiException } from '../../utils/exceptions';
import { CachedEntity, buildSubscriberKey } from '../../services';

@Injectable()
export class GetSubscriberTemplatePreference {
  constructor(
    private subscriberPreferenceRepository: SubscriberPreferenceRepository,
    private messageTemplateRepository: MessageTemplateRepository,
    private subscriberRepository: SubscriberRepository
  ) {}

  async execute(
    command: GetSubscriberTemplatePreferenceCommand
  ): Promise<ISubscriberPreferenceResponse> {
    const subscriber =
      command.subscriber ??
      (await this.fetchSubscriber({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      }));

    if (!subscriber) {
      throw new ApiException(`Subscriber ${command.subscriberId} not found`);
    }
    const initialActiveChannels = await this.getActiveChannels(command);
    const subscriberPreference =
      await this.subscriberPreferenceRepository.findOne({
        _environmentId: command.environmentId,
        _subscriberId: subscriber._id,
        _templateId: command.template._id,
      });

    const templateConfiguration = mapTemplateConfiguration(command.template);
    const templatePreferred = subscriberPreference?.enabled ?? true;
    const subscriberChannelPreference = subscriberPreference?.channels;
    const templateChannelPreference = command.template.preferenceSettings;

    const { channelPreferences, overrides } =
      this.getChannelPreferenceAndOverrides(
        templateChannelPreference,
        subscriberChannelPreference,
        initialActiveChannels
      );

    return {
      template: templateConfiguration,
      preference: {
        enabled: templatePreferred,
        channels: channelPreferences,
        overrides: overrides,
      },
    };
  }

  private async getActiveChannels(
    command: GetSubscriberTemplatePreferenceCommand
  ) {
    const activeChannels = await this.queryActiveChannels(command);
    const initialActiveChannels: IPreferenceChannels = filteredPreference(
      {
        email: true,
        sms: true,
        in_app: true,
        chat: true,
        push: true,
      },
      activeChannels
    );

    return initialActiveChannels;
  }

  private getChannelPreferenceAndOverrides(
    templateChannelPreference,
    subscriberChannelPreference,
    initialActiveChannels: IPreferenceChannels
  ) {
    const { preferences, overrides } = determineOverrides(
      {
        template: templateChannelPreference,
        subscriber: subscriberChannelPreference,
      },
      initialActiveChannels
    );

    return { channelPreferences: preferences, overrides };
  }

  private async queryActiveChannels(
    command: GetSubscriberTemplatePreferenceCommand
  ): Promise<ChannelTypeEnum[]> {
    const activeSteps = command.template.steps.filter(
      (step) => step.active === true
    );

    const stepMissingTemplate = activeSteps.some((step) => !step.template);

    if (stepMissingTemplate) {
      const messageIds = activeSteps.map((step) => step._templateId);

      const messageTemplates = await this.messageTemplateRepository.find({
        _environmentId: command.environmentId,
        _id: {
          $in: messageIds,
        },
      });

      return [
        ...new Set(
          messageTemplates.map(
            (messageTemplate) => messageTemplate.type
          ) as unknown as ChannelTypeEnum[]
        ),
      ];
    }

    const channels = activeSteps
      .map((item) => item.template.type as StepTypeEnum)
      .reduce<StepTypeEnum[]>((list, channel) => {
        if (list.includes(channel)) {
          return list;
        }
        list.push(channel);

        return list;
      }, []);

    return channels as unknown as ChannelTypeEnum[];
  }

  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  private async fetchSubscriber({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }): Promise<SubscriberEntity | null> {
    return await this.subscriberRepository.findBySubscriberId(
      _environmentId,
      subscriberId
    );
  }
}

function updateOverrideReasons(
  channelName,
  sourceName: string,
  index: number,
  overrideReasons: IPreferenceOverride[]
) {
  const currOverride: IPreferenceOverride = {
    channel: channelName as ChannelTypeEnum,
    source: sourceName as 'template' | 'subscriber',
  };

  const notFoundFlag = -1;
  const existsInOverrideReasons = index !== notFoundFlag;
  if (existsInOverrideReasons) {
    overrideReasons[index] = currOverride;
  } else {
    overrideReasons.push(currOverride);
  }
}

export function determineOverrides(
  preferenceSources: Record<'template' | 'subscriber', IPreferenceChannels>,
  initialActiveChannels: IPreferenceChannels
) {
  const priorityOrder = ['template', 'subscriber'];
  const overrideReasons: IPreferenceOverride[] = [];
  const resultPreferences = { ...initialActiveChannels };

  // iterate over preference sources, the smallest priority first
  for (const sourceName of priorityOrder) {
    const preference = preferenceSources[sourceName] as IPreferenceChannels;
    const missingPreferenceObject = !preference;

    // subscriber may miss preference if he did not toggle his preferences
    if (missingPreferenceObject) continue;

    // iterate over preferences and override overrideReasons if there is a diff
    for (const [channelName, channelValue] of Object.entries(preference)) {
      if (!(resultPreferences[channelName] != null)) continue;

      const index = overrideReasons.findIndex(
        (overrideReason) => overrideReason.channel === channelName
      );

      const diff = overrideReasons[index]?.source !== channelValue;

      if (!diff) continue;

      resultPreferences[channelName] = channelValue;
      updateOverrideReasons(channelName, sourceName, index, overrideReasons);
    }
  }

  return {
    preferences: resultPreferences,
    overrides: overrideReasons,
  };
}

export const filteredPreference = (
  preferences: IPreferenceChannels,
  filterKeys: string[]
) =>
  Object.entries(preferences).reduce(
    (obj, [key, value]) =>
      filterKeys.includes(key) ? { ...obj, [key]: value } : obj,
    {}
  );

function mapTemplateConfiguration(
  template: NotificationTemplateEntity
): ITemplateConfiguration {
  return {
    _id: template._id,
    name: template.name,
    critical: template.critical != null ? template.critical : true,
  };
}
