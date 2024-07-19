import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import {
  ChannelTypeEnum,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  PreferenceLevelEnum,
  SubscriberEntity,
  SubscriberPreferenceRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ISubscriberPreferences } from '@novu/shared';
import { AnalyticsEventsEnum } from '../../utils';

import { UpdatePreferencesCommand } from './update-preferences.command';

@Injectable()
export class UpdatePreferences {
  constructor(
    private subscriberPreferenceRepository: SubscriberPreferenceRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private subscriberRepository: SubscriberRepository,
    private analyticsService: AnalyticsService
  ) {}

  async execute(command: UpdatePreferencesCommand): Promise<ISubscriberPreferences> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) throw new NotFoundException(`Subscriber with id: ${command.subscriberId} is not found`);

    let workflow: NotificationTemplateEntity | null = null;

    if (command.level === PreferenceLevelEnum.TEMPLATE && command.workflowId) {
      workflow = await this.notificationTemplateRepository.findById(command.workflowId, command.environmentId);

      if (!workflow) {
        throw new NotFoundException(`Workflow with id: ${command.workflowId} is not found`);
      }
    }

    const userPreference = await this.findPreference(command, subscriber);

    if (!userPreference) {
      await this.createUserPreference(command, subscriber);
    } else {
      await this.updateUserPreference(command, subscriber);
    }

    const updatedPreference = await this.findPreference(command, subscriber);

    if (!updatedPreference) {
      throw new NotFoundException(`Preference not found`);
    }

    return {
      level: updatedPreference.level,
      preferences: {
        enabled: updatedPreference.enabled,
        channels: updatedPreference.channels,
      },
      ...(workflow && updatedPreference.level === PreferenceLevelEnum.TEMPLATE && { workflow }),
    };
  }

  private async createUserPreference(command: UpdatePreferencesCommand, subscriber: SubscriberEntity): Promise<void> {
    const channelObj = {
      chat: command.chat,
      email: command.email,
      in_app: command.in_app,
      push: command.push,
      sms: command.sms,
    } as Record<ChannelTypeEnum, boolean>;

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.CREATE_PREFERENCES, '', {
      _organization: command.organizationId,
      _subscriber: subscriber._id,
      _workflowId: command.workflowId,
      level: command.level,
      channels: channelObj,
      __source: 'UpdatePreferences',
    });

    await this.subscriberPreferenceRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: subscriber._id,
      enabled: true,
      channels: channelObj,
      level: command.level,
      ...(command.level === PreferenceLevelEnum.TEMPLATE && command.workflowId && { _templateId: command.workflowId }),
    });
  }
  private async updateUserPreference(command: UpdatePreferencesCommand, subscriber: SubscriberEntity): Promise<void> {
    const channelObj = {
      chat: command.chat,
      email: command.email,
      in_app: command.in_app,
      push: command.push,
      sms: command.sms,
    } as Record<ChannelTypeEnum, boolean>;

    // Remove undefined values from the object
    const updatePayload = Object.entries(channelObj).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }

      return acc;
    }, {} as Record<ChannelTypeEnum, boolean>);

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.UPDATE_PREFERENCES, '', {
      _organization: command.organizationId,
      _subscriber: subscriber._id,
      _workflowId: command.workflowId,
      level: command.level,
      channels: updatePayload,
    });

    const updateFields = {};
    for (const [key, value] of Object.entries(updatePayload)) {
      if (value !== undefined) {
        updateFields[`channels.${key}`] = value;
      }
    }

    await this.subscriberPreferenceRepository.update(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: subscriber._id,
        level: command.level,
        ...(command.level === PreferenceLevelEnum.TEMPLATE &&
          command.workflowId && { _templateId: command.workflowId }),
      },
      {
        $set: updateFields,
      }
    );
  }

  private async findPreference(command: UpdatePreferencesCommand, subscriber: SubscriberEntity) {
    const query = {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _subscriberId: subscriber._id,
      level: command.level,
      ...(command.level === PreferenceLevelEnum.TEMPLATE && command.workflowId && { _templateId: command.workflowId }),
    };

    return await this.subscriberPreferenceRepository.findOne(query);
  }
}
