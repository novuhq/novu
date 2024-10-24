import { Injectable } from '@nestjs/common';
import {
  PreferenceLevelEnum,
  SubscriberEntity,
  SubscriberPreferenceRepository,
  SubscriberRepository,
} from '@novu/dal';

import { IPreferenceChannels, ChannelTypeEnum } from '@novu/shared';
import { GetSubscriberGlobalPreferenceCommand } from './get-subscriber-global-preference.command';
import { buildSubscriberKey, CachedEntity } from '../../services/cache';
import { ApiException } from '../../utils/exceptions';
import { GetPreferences } from '../get-preferences';
import { GetSubscriberPreference } from '../get-subscriber-preference/get-subscriber-preference.usecase';
import { filteredPreference } from '../get-subscriber-template-preference/get-subscriber-template-preference.usecase';

@Injectable()
export class GetSubscriberGlobalPreference {
  constructor(
    private subscriberPreferenceRepository: SubscriberPreferenceRepository,
    private subscriberRepository: SubscriberRepository,
    private getPreferences: GetPreferences,
    private getSubscriberPreference: GetSubscriberPreference,
  ) {}

  async execute(command: GetSubscriberGlobalPreferenceCommand) {
    const subscriber = await this.getSubscriber(command);

    const activeChannels = await this.getActiveChannels(command);

    const subscriberGlobalPreference = await this.getSubscriberGlobalPreference(
      command,
      subscriber._id,
    );

    const channelsWithDefaults = this.buildDefaultPreferences(
      subscriberGlobalPreference.channels,
    );

    const channels = filteredPreference(channelsWithDefaults, activeChannels);

    return {
      preference: {
        enabled: subscriberGlobalPreference.enabled,
        channels,
      },
    };
  }

  private async getSubscriberGlobalPreference(
    command: GetSubscriberGlobalPreferenceCommand,
    subscriberId: string,
  ): Promise<{
    channels: IPreferenceChannels;
    enabled: boolean;
  }> {
    let subscriberGlobalChannels: IPreferenceChannels;
    let enabled: boolean;
    /** @deprecated */
    const subscriberGlobalPreferenceV1 =
      await this.subscriberPreferenceRepository.findOne({
        _environmentId: command.environmentId,
        _subscriberId: subscriberId,
        level: PreferenceLevelEnum.GLOBAL,
      });

    const subscriberGlobalPreferenceV2 =
      await this.getPreferences.getPreferenceChannels({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId,
      });

    // Prefer the V2 preference object if it exists, otherwise fallback to V1
    if (subscriberGlobalPreferenceV2 !== undefined) {
      subscriberGlobalChannels = subscriberGlobalPreferenceV2;
      enabled = true;
    } else {
      subscriberGlobalChannels = subscriberGlobalPreferenceV1?.channels ?? {};
      enabled = subscriberGlobalPreferenceV1?.enabled;
    }

    return {
      channels: subscriberGlobalChannels,
      enabled,
    };
  }

  private async getActiveChannels(
    command: GetSubscriberGlobalPreferenceCommand,
  ): Promise<ChannelTypeEnum[]> {
    const subscriberWorkflowPreferences =
      await this.getSubscriberPreference.execute(
        GetSubscriberGlobalPreferenceCommand.create({
          environmentId: command.environmentId,
          subscriberId: command.subscriberId,
          organizationId: command.organizationId,
        }),
      );

    const activeChannels = new Set<ChannelTypeEnum>();
    subscriberWorkflowPreferences.forEach((subscriberWorkflowPreference) => {
      Object.keys(subscriberWorkflowPreference.preference.channels).forEach(
        (channel) => {
          activeChannels.add(channel as ChannelTypeEnum);
        },
      );
    });

    return Array.from(activeChannels);
  }

  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  private async getSubscriber(
    command: GetSubscriberGlobalPreferenceCommand,
  ): Promise<SubscriberEntity | null> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      command.subscriberId,
    );

    if (!subscriber) {
      throw new ApiException(`Subscriber ${command.subscriberId} not found`);
    }

    return subscriber;
  }
  // adds default state for missing channels
  private buildDefaultPreferences(preference: IPreferenceChannels) {
    const defaultPreference: IPreferenceChannels = {
      email: true,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    };

    return { ...defaultPreference, ...preference };
  }
}
