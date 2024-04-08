import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SubscriberPreferenceEntity,
  SubscriberPreferenceRepository,
  NotificationTemplateRepository,
  SubscriberEntity,
  SubscriberRepository,
  MemberRepository,
  PreferenceLevelEnum,
} from '@novu/dal';
import {
  AnalyticsService,
  GetSubscriberTemplatePreference,
  GetSubscriberTemplatePreferenceCommand,
} from '@novu/application-generic';
import { ISubscriberPreferenceResponse } from '@novu/shared';

import { UpdateSubscriberPreferenceCommand } from './update-subscriber-preference.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class UpdateSubscriberPreference {
  constructor(
    private subscriberPreferenceRepository: SubscriberPreferenceRepository,
    private getSubscriberTemplatePreference: GetSubscriberTemplatePreference,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private analyticsService: AnalyticsService,
    private subscriberRepository: SubscriberRepository,
    private memberRepository: MemberRepository
  ) {}

  async execute(command: UpdateSubscriberPreferenceCommand): Promise<ISubscriberPreferenceResponse> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) throw new NotFoundException(`Subscriber not found`);

    const userPreference = await this.subscriberPreferenceRepository.findOne({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _subscriberId: subscriber._id,
      _templateId: command.templateId,
    });

    const admin = await this.memberRepository.getOrganizationAdminAccount(command.organizationId);
    if (admin) {
      this.analyticsService.mixpanelTrack('Update User Preference - [Notification Center]', '', {
        _organization: command.organizationId,
        _subscriber: subscriber._id,
        _template: command.templateId,
        channel: command.channel?.type,
        enabled: command.channel?.enabled,
      });
    }

    if (!userPreference) {
      await this.createUserPreference(command, subscriber);
    } else {
      await this.updateUserPreference(command, subscriber);
    }

    const template = await this.notificationTemplateRepository.findById(command.templateId, command.environmentId);
    if (!template) {
      throw new NotFoundException(`Template with id ${command.templateId} is not found`);
    }

    const getSubscriberPreferenceCommand = GetSubscriberTemplatePreferenceCommand.create({
      organizationId: command.organizationId,
      subscriberId: command.subscriberId,
      environmentId: command.environmentId,
      template,
    });

    return await this.getSubscriberTemplatePreference.execute(getSubscriberPreferenceCommand);
  }

  private async createUserPreference(
    command: UpdateSubscriberPreferenceCommand,
    subscriber: SubscriberEntity
  ): Promise<void> {
    const channelObj = {} as Record<'email' | 'sms' | 'in_app' | 'chat' | 'push', boolean>;
    if (command.channel) {
      channelObj[command.channel.type] = command.channel.enabled;
    }

    await this.subscriberPreferenceRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: subscriber._id,
      _templateId: command.templateId,
      /*
       * Unless explicitly set to false when creating a user preference we want it to be enabled
       * even if not passing at first enabled to true.
       */
      enabled: command.enabled !== false,
      channels: command.channel?.type ? channelObj : null,
      level: PreferenceLevelEnum.TEMPLATE,
    });
  }

  private async updateUserPreference(
    command: UpdateSubscriberPreferenceCommand,
    subscriber: SubscriberEntity
  ): Promise<void> {
    const updatePayload: Partial<SubscriberPreferenceEntity> = {};

    if (command.enabled != null) {
      updatePayload.enabled = command.enabled;
    }

    if (command.channel?.type) {
      updatePayload[`channels.${command.channel.type}`] = command.channel.enabled;
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new ApiException('In order to make an update you need to provider channel or enabled');
    }

    await this.subscriberPreferenceRepository.update(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: subscriber._id,
        _templateId: command.templateId,
      },
      {
        $set: updatePayload,
      }
    );
  }
}
