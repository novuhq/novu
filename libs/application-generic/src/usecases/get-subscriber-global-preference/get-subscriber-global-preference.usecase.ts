import { Injectable } from '@nestjs/common';
import {
  PreferenceLevelEnum,
  SubscriberEntity,
  SubscriberPreferenceRepository,
  SubscriberRepository,
} from '@novu/dal';

import { IPreferenceChannels } from '@novu/shared';
import { GetSubscriberGlobalPreferenceCommand } from './get-subscriber-global-preference.command';
import { buildSubscriberKey, CachedEntity } from '../../services/cache';
import { ApiException } from '../../utils/exceptions';
import { IPreferenceChannels } from '@novu/shared';
import { GetPreferences } from '../get-preferences';

@Injectable()
export class GetSubscriberGlobalPreference {
  constructor(
    private subscriberPreferenceRepository: SubscriberPreferenceRepository,
    private subscriberRepository: SubscriberRepository,
    private getPreferences: GetPreferences
  ) {}

  async execute(command: GetSubscriberGlobalPreferenceCommand) {
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
        level: PreferenceLevelEnum.GLOBAL,
      });

    const subscriberChannelPreference =
      (await this.getPreferences.getPreferenceChannels({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId: command.subscriberId,
      })) || subscriberPreference?.channels;
    const channels = this.updatePreferenceStateWithDefault(
      subscriberChannelPreference ?? {}
    );

    return {
      preference: {
        enabled: subscriberPreference?.enabled ?? true,
        channels,
      },
    };
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
  // adds default state for missing channels
  private updatePreferenceStateWithDefault(preference: IPreferenceChannels) {
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
