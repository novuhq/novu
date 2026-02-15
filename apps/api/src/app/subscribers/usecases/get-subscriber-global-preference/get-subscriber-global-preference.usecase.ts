import { Injectable, NotFoundException } from '@nestjs/common';
import {
  buildSubscriberKey,
  CachedResponse,
  filteredPreference,
  GetPreferences,
  Instrument,
  InstrumentUsecase,
} from '@novu/application-generic';
import {
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelTypeEnum, IPreferenceChannels, Schedule } from '@novu/shared';
import { GetSubscriberGlobalPreferenceCommand } from './get-subscriber-global-preference.command';

@Injectable()
export class GetSubscriberGlobalPreference {
  constructor(
    private subscriberRepository: SubscriberRepository,
    private getPreferences: GetPreferences,
    private notificationTemplateRepository: NotificationTemplateRepository
  ) {}

  @InstrumentUsecase()
  async execute(
    command: GetSubscriberGlobalPreferenceCommand
  ): Promise<{ preference: { enabled: boolean; channels: IPreferenceChannels; schedule?: Schedule } }> {
    const subscriber = command.subscriber ?? (await this.getSubscriber(command));

    const activeChannels = await this.getActiveChannels(command);

    const subscriberGlobalPreference = await this.getPreferences.getSubscriberGlobalPreference({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      subscriberId: subscriber._id,
      contextKeys: command.contextKeys,
    });

    const channelsWithDefaults = this.buildDefaultPreferences(subscriberGlobalPreference.channels);

    let channels: IPreferenceChannels;
    if (command.includeInactiveChannels === true) {
      channels = channelsWithDefaults;
    } else {
      channels = filteredPreference(channelsWithDefaults, activeChannels);
    }

    return {
      preference: {
        enabled: subscriberGlobalPreference.enabled,
        channels,
        schedule: subscriberGlobalPreference.schedule,
      },
    };
  }

  @Instrument()
  private async getActiveChannels(command: GetSubscriberGlobalPreferenceCommand): Promise<ChannelTypeEnum[]> {
    if (command.includeInactiveChannels) {
      return Object.values(ChannelTypeEnum);
    }

    const workflowList =
      command.workflowList ??
      (await this.notificationTemplateRepository.filterActive({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        tags: undefined,
        critical: undefined,
        severity: undefined,
        select: '_id steps.active steps._templateId',
        limit: 100,
      }));

    const activeChannels = new Set<ChannelTypeEnum>();

    for (const workflow of workflowList) {
      const workflowChannels = this.getChannels(workflow, command.includeInactiveChannels);
      for (const channel of workflowChannels) {
        activeChannels.add(channel);
      }
    }

    return Array.from(activeChannels);
  }

  private getChannels(workflow: NotificationTemplateEntity, includeInactiveChannels: boolean): ChannelTypeEnum[] {
    if (includeInactiveChannels) {
      return Object.values(ChannelTypeEnum);
    }

    const channelSet = new Set<ChannelTypeEnum>();

    for (const step of workflow.steps) {
      if (step.active && step.template?.type) {
        channelSet.add(step.template.type as unknown as ChannelTypeEnum);
      }
    }

    return Array.from(channelSet);
  }

  private async getSubscriber(command: GetSubscriberGlobalPreferenceCommand): Promise<Pick<SubscriberEntity, '_id'>> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      command.subscriberId,
      false,
      '_id'
    );

    if (!subscriber) {
      throw new NotFoundException(`Subscriber ${command.subscriberId} not found`);
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
