import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
  UpsertPreferences,
  UpsertSubscriberWorkflowPreferencesCommand,
  UpsertSubscriberGlobalPreferencesCommand,
  InstrumentUsecase,
  Instrument,
} from '@novu/application-generic';
import {
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import {
  IPreferenceChannels,
  PreferenceLevelEnum,
  WorkflowPreferences,
  WorkflowPreferencesPartial,
} from '@novu/shared';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { AnalyticsEventsEnum } from '../../utils';
import { InboxPreference } from '../../utils/types';
import { UpdatePreferencesCommand } from './update-preferences.command';
import {
  GetSubscriberGlobalPreference,
  GetSubscriberGlobalPreferenceCommand,
} from '../../../subscribers/usecases/get-subscriber-global-preference';

@Injectable()
export class UpdatePreferences {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private subscriberRepository: SubscriberRepository,
    private analyticsService: AnalyticsService,
    private getSubscriberGlobalPreference: GetSubscriberGlobalPreference,
    private getSubscriberTemplatePreferenceUsecase: GetSubscriberTemplatePreference,
    private upsertPreferences: UpsertPreferences
  ) {}

  @InstrumentUsecase()
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

    await this.updateSubscriberPreference(command, subscriber);

    return await this.findPreference(command, subscriber);
  }

  @Instrument()
  private async updateSubscriberPreference(
    command: UpdatePreferencesCommand,
    subscriber: SubscriberEntity
  ): Promise<void> {
    const channelPreferences: IPreferenceChannels = this.buildPreferenceChannels(command);

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
      channels: channelPreferences,
    });
  }

  private buildPreferenceChannels(command: UpdatePreferencesCommand): IPreferenceChannels {
    return {
      ...(command.chat !== undefined && { chat: command.chat }),
      ...(command.email !== undefined && { email: command.email }),
      ...(command.in_app !== undefined && { in_app: command.in_app }),
      ...(command.push !== undefined && { push: command.push }),
      ...(command.sms !== undefined && { sms: command.sms }),
    };
  }

  @Instrument()
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
          includeInactiveChannels: command.includeInactiveChannels,
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
        includeInactiveChannels: command.includeInactiveChannels,
      })
    );

    return {
      level: PreferenceLevelEnum.GLOBAL,
      enabled: preference.enabled,
      channels: preference.channels,
    };
  }

  @Instrument()
  private async storePreferences(item: {
    channels: IPreferenceChannels;
    organizationId: string;
    _subscriberId: string;
    environmentId: string;
    templateId?: string;
  }): Promise<void> {
    const preferences: WorkflowPreferencesPartial = {
      channels: Object.entries(item.channels).reduce(
        (outputChannels, [channel, enabled]) => ({
          ...outputChannels,
          [channel]: { enabled },
        }),
        {} as WorkflowPreferences['channels']
      ),
    };

    if (item.templateId) {
      await this.upsertPreferences.upsertSubscriberWorkflowPreferences(
        UpsertSubscriberWorkflowPreferencesCommand.create({
          environmentId: item.environmentId,
          organizationId: item.organizationId,
          _subscriberId: item._subscriberId,
          templateId: item.templateId,
          preferences,
        })
      );
    } else {
      await this.upsertPreferences.upsertSubscriberGlobalPreferences(
        UpsertSubscriberGlobalPreferencesCommand.create({
          preferences,
          environmentId: item.environmentId,
          organizationId: item.organizationId,
          _subscriberId: item._subscriberId,
        })
      );
    }
  }
}
