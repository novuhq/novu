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
    const activeChannels = await this.queryActiveChannels(command);
    const subscriber =
      command.subscriber ??
      (await this.fetchSubscriber({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      }));

    if (!subscriber) {
      throw new ApiException(`Subscriber ${command.subscriberId} not found`);
    }

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
        activeChannels
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

  private getChannelPreferenceAndOverrides(
    templateChannelPreference,
    subscriberChannelPreference,
    activeChannels: ChannelTypeEnum[]
  ) {
    const preferenceOverrideResult = determineOverrides({
      template: templateChannelPreference,
      subscriber: subscriberChannelPreference,
    });

    const channelPreferences = filterActiveChannels(
      activeChannels,
      preferenceOverrideResult.preferences
    );
    const overrides = filterActiveOverrides(
      activeChannels,
      preferenceOverrideResult.overrides
    );

    return { channelPreferences, overrides };
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
  preferenceSources: Record<'template' | 'subscriber', IPreferenceChannels>
) {
  const priorityOrder = ['template', 'subscriber'];
  const resultPreferences: IPreferenceChannels = {
    email: true,
    sms: true,
    in_app: true,
    chat: true,
    push: true,
  };
  const overrideReasons: IPreferenceOverride[] = [];

  // iterate over preference sources, the smallest priority first
  for (const sourceName of priorityOrder) {
    const preference = preferenceSources[sourceName] as IPreferenceChannels;
    const missingPreferenceObject = !preference;

    // subscriber may miss preference if he did not toggle his preferences
    if (missingPreferenceObject) continue;

    // iterate over preferences and override overrideReasons if there is a diff
    for (const [channelName, channelValue] of Object.entries(preference)) {
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

export function filterActiveChannels(
  activeChannels: ChannelTypeEnum[],
  preferences: IPreferenceChannels
): IPreferenceChannels {
  const filteredChannels = { ...preferences };
  for (const key in preferences) {
    if (!activeChannels.some((channel) => channel === key)) {
      delete filteredChannels[key];
    }
  }

  return filteredChannels;
}

export function filterActiveOverrides(
  activeChannels: ChannelTypeEnum[],
  overrides: IPreferenceOverride[]
): IPreferenceOverride[] {
  const preferenceOverrides: IPreferenceOverride[] = [];
  for (const override of overrides) {
    if (activeChannels.some((channel) => channel === override.channel)) {
      preferenceOverrides.push(override);
    }
  }

  return preferenceOverrides;
}

function mapTemplateConfiguration(
  template: NotificationTemplateEntity
): ITemplateConfiguration {
  return {
    _id: template._id,
    name: template.name,
    critical: template.critical != null ? template.critical : true,
  };
}
