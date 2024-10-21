import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
  UpsertPreferences,
  UpsertSubscriberWorkflowPreferencesCommand,
  UpsertSubscriberGlobalPreferencesCommand,
} from '@novu/application-generic';
import {
  ChannelTypeEnum,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  PreferenceLevelEnum,
  SubscriberEntity,
  SubscriberPreferenceEntity,
  SubscriberPreferenceRepository,
  SubscriberRepository,
} from '@novu/dal';
import { IPreferenceChannels, WorkflowPreferences, WorkflowPreferencesPartial } from '@novu/shared';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { AnalyticsEventsEnum } from '../../utils';
import { InboxPreference } from '../../utils/types';
import { UpdatePreferencesCommand } from './update-preferences.command';

const PREFERENCE_DEFAULT_VALUE = true;

@Injectable()
export class UpdatePreferences {
  constructor(
    private subscriberPreferenceRepository: SubscriberPreferenceRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private subscriberRepository: SubscriberRepository,
    private analyticsService: AnalyticsService,
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference,
    private getSubscriberTemplatePreferenceUsecase: GetSubscriberTemplatePreference,
    private upsertPreferences: UpsertPreferences
  ) {}

  async execute(command: UpdatePreferencesCommand): Promise<InboxPreference> {
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

    const userPreference: SubscriberPreferenceEntity | null = await this.subscriberPreferenceRepository.findOne(
      this.commonQuery(command, subscriber)
    );
    if (!userPreference) {
      await this.createUserPreference(command, subscriber);
    } else {
      await this.updateUserPreference(command, subscriber, userPreference);
    }

    return await this.findPreference(command, subscriber);
  }

  private async createUserPreference(command: UpdatePreferencesCommand, subscriber: SubscriberEntity): Promise<void> {
    const channelObj = {
      chat: command.chat,
      email: command.email,
      in_app: command.in_app,
      push: command.push,
      sms: command.sms,
    } as Record<ChannelTypeEnum, boolean>;

    const channelPreferences = Object.values(ChannelTypeEnum).reduce((acc, key) => {
      acc[key] = channelObj[key] !== undefined ? channelObj[key] : PREFERENCE_DEFAULT_VALUE;

      return acc;
    }, {} as IPreferenceChannels);
    /*
     * Backwards compatible storage of new Preferences DTO.
     *
     * Currently, this is a side-effect due to the way that Preferences are stored
     * and resolved with overrides in cascading order, necessitating a lookup against
     * the old preferences structure before we can store the new Preferences DTO.
     */
    await this.storePreferences({
      channels: channelPreferences,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      _subscriberId: subscriber._id,
      templateId: command.workflowId,
    });

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.CREATE_PREFERENCES, '', {
      _organization: command.organizationId,
      _subscriber: subscriber._id,
      _workflowId: command.workflowId,
      level: command.level,
      channels: channelObj,
    });

    const query = this.commonQuery(command, subscriber);
    await this.subscriberPreferenceRepository.create({
      ...query,
      enabled: true,
      channels: channelObj,
    });
  }

  private async updateUserPreference(
    command: UpdatePreferencesCommand,
    subscriber: SubscriberEntity,
    userPreference: SubscriberPreferenceEntity
  ): Promise<void> {
    const channelObj = {
      chat: command.chat,
      email: command.email,
      in_app: command.in_app,
      push: command.push,
      sms: command.sms,
    } as Record<ChannelTypeEnum, boolean>;

    const channelPreferences = Object.values(ChannelTypeEnum).reduce((acc, key) => {
      acc[key] = channelObj[key];

      if (acc[key] === undefined) {
        acc[key] = userPreference.channels[key] === undefined ? PREFERENCE_DEFAULT_VALUE : userPreference.channels[key];
      }

      return acc;
    }, {} as IPreferenceChannels);
    /*
     * Backwards compatible storage of new Preferences DTO.
     *
     * Currently, this is a side-effect due to the way that Preferences are stored
     * and resolved with overrides in cascading order, necessitating a lookup against
     * the old preferences structure before we can store the new Preferences DTO.
     */
    await this.storePreferences({
      channels: channelPreferences,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      _subscriberId: subscriber._id,
      templateId: command.workflowId,
    });

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

  private async findPreference(
    command: UpdatePreferencesCommand,
    subscriber: SubscriberEntity
  ): Promise<InboxPreference> {
    if (command.level === PreferenceLevelEnum.TEMPLATE && command.workflowId) {
      const workflow = await this.notificationTemplateRepository.findById(command.workflowId, command.environmentId);
      if (!workflow) {
        throw new NotFoundException(`Workflow with id: ${command.workflowId} is not found`);
      }

      const { preference } = await this.getSubscriberTemplatePreferenceUsecase.execute(
        GetSubscriberTemplatePreferenceCommand.create({
          organizationId: command.organizationId,
          subscriberId: command.subscriberId,
          environmentId: command.environmentId,
          template: workflow,
          subscriber,
        })
      );

      return {
        level: PreferenceLevelEnum.TEMPLATE,
        enabled: preference.enabled,
        channels: preference.channels,
        workflow: {
          id: workflow._id,
          identifier: workflow.triggers[0].identifier,
          name: workflow.name,
          critical: workflow.critical,
          tags: workflow.tags,
        },
      };
    }

    const { preference } = await this.getSubscriberGlobalPreference.execute(
      GetSubscriberGlobalPreferenceCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
      })
    );

    return {
      level: PreferenceLevelEnum.GLOBAL,
      enabled: preference.enabled,
      channels: preference.channels,
    };
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

  private async storePreferences(item: {
    channels: IPreferenceChannels;
    organizationId: string;
    _subscriberId: string;
    environmentId: string;
    templateId?: string;
  }) {
    const preferences: WorkflowPreferencesPartial = {
      all: {
        enabled: PREFERENCE_DEFAULT_VALUE,
        readOnly: false,
      },
      channels: Object.entries(item.channels).reduce(
        (outputChannels, [channel, enabled]) => ({
          ...outputChannels,
          [channel]: { enabled },
        }),
        {} as WorkflowPreferences['channels']
      ),
    };

    if (item.templateId) {
      return await this.upsertPreferences.upsertSubscriberWorkflowPreferences(
        UpsertSubscriberWorkflowPreferencesCommand.create({
          environmentId: item.environmentId,
          organizationId: item.organizationId,
          _subscriberId: item._subscriberId,
          templateId: item.templateId,
          preferences,
        })
      );
    }

    return await this.upsertPreferences.upsertSubscriberGlobalPreferences(
      UpsertSubscriberGlobalPreferencesCommand.create({
        preferences,
        environmentId: item.environmentId,
        organizationId: item.organizationId,
        _subscriberId: item._subscriberId,
      })
    );
  }
}
