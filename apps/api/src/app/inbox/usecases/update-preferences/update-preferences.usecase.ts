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
import { ApiException } from '../../../shared/exceptions/api.exception';
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
      if (workflow.critical) {
        throw new ApiException(`Critical workflow with id: ${command.workflowId} can not be updated`);
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
      enabled: updatedPreference.enabled,
      channels: updatedPreference.channels,
      ...(workflow &&
        updatedPreference.level === PreferenceLevelEnum.TEMPLATE && {
          workflow: {
            critical: workflow.critical,
            id: workflow._id,
            name: workflow.name,
            tags: workflow.tags,
            triggers: workflow.triggers,
          },
        }),
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

    const query = this.commonQuery(command, subscriber);
    await this.subscriberPreferenceRepository.create({
      ...query,
      enabled: true,
      channels: channelObj,
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

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.UPDATE_PREFERENCES, '', {
      _organization: command.organizationId,
      _subscriber: subscriber._id,
      _workflowId: command.workflowId,
      level: command.level,
      channels: channelObj,
    });

    const updateFields = {};
    for (const [key, value] of Object.entries(channelObj)) {
      if (value !== undefined) {
        updateFields[`channels.${key}`] = value;
      }
    }

    const query = this.commonQuery(command, subscriber);
    await this.subscriberPreferenceRepository.update(query, {
      $set: updateFields,
    });
  }

  private async findPreference(command: UpdatePreferencesCommand, subscriber: SubscriberEntity) {
    const query = this.commonQuery(command, subscriber);

    return await this.subscriberPreferenceRepository.findOne(query);
  }

  private commonQuery(command: UpdatePreferencesCommand, subscriber: SubscriberEntity) {
    return {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _subscriberId: subscriber._id,
      level: command.level,
      ...(command.level === PreferenceLevelEnum.TEMPLATE && command.workflowId && { _templateId: command.workflowId }),
    };
  }
}
