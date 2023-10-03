import { Injectable, NotFoundException } from '@nestjs/common';
import { GetSubscriberGlobalPreference, GetSubscriberGlobalPreferenceCommand } from '@novu/application-generic';
import {
  ChannelTypeEnum,
  PreferenceLevelEnum,
  SubscriberEntity,
  SubscriberPreferenceEntity,
  SubscriberPreferenceRepository,
  SubscriberRepository,
} from '@novu/dal';

import { UpdateSubscriberGlobalPreferencesCommand } from './update-subscriber-global-preferences.command';

@Injectable()
export class UpdateSubscriberGlobalPreferences {
  constructor(
    private subscriberPreferenceRepository: SubscriberPreferenceRepository,
    private subscriberRepository: SubscriberRepository,
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference
  ) {}

  async execute(command: UpdateSubscriberGlobalPreferencesCommand) {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) throw new NotFoundException(`Subscriber not found`);

    const userGlobalPreference = await this.subscriberPreferenceRepository.findOne({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _subscriberId: subscriber._id,
      level: PreferenceLevelEnum.GLOBAL,
    });

    if (!userGlobalPreference) {
      await this.createUserPreference(command, subscriber);
    } else {
      await this.updateUserPreference(command, subscriber);
    }

    return await this.getSubscriberGlobalPreference.execute(
      GetSubscriberGlobalPreferenceCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      })
    );
  }

  private async createUserPreference(
    command: UpdateSubscriberGlobalPreferencesCommand,
    subscriber: SubscriberEntity
  ): Promise<void> {
    const channelObj = {} as Record<ChannelTypeEnum, boolean>;
    if (command.preferences && command.preferences.length > 0) {
      for (const preference of command.preferences) {
        if (preference.type) {
          channelObj[preference.type] = preference.enabled;
        }
      }
    }

    await this.subscriberPreferenceRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: subscriber._id,
      /*
       * Unless explicitly set to false when creating a user preference we want it to be enabled
       * even if not passing at first enabled to true.
       */
      enabled: command.enabled !== false,
      channels: command.preferences && command.preferences.length > 0 ? channelObj : null,
      level: PreferenceLevelEnum.GLOBAL,
    });
  }

  private async updateUserPreference(
    command: UpdateSubscriberGlobalPreferencesCommand,
    subscriber: SubscriberEntity
  ): Promise<void> {
    const updatePayload: Partial<SubscriberPreferenceEntity> = {};

    if (command.enabled != null) {
      updatePayload.enabled = command.enabled;
    }

    if (command.preferences && command.preferences.length > 0) {
      for (const preference of command.preferences) {
        if (preference.type) {
          updatePayload[`channels.${preference.type}`] = preference.enabled;
        }
      }
    }

    await this.subscriberPreferenceRepository.update(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: subscriber._id,
        level: PreferenceLevelEnum.GLOBAL,
      },
      {
        $set: updatePayload,
      }
    );
  }
}
